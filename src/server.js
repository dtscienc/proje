require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../file")));

const TOOLS = [
  {
    type: "function",
    function: {
      name: "analyse_task",
      description: "Analyse the task or bug report. Break down what is needed, identify constraints, edge cases, and approach. Call this first.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What the task requires" },
          approach: { type: "string", description: "High-level approach and algorithm choice" },
          edge_cases: { type: "array", items: { type: "string" }, description: "Edge cases to handle" },
          language: { type: "string", description: "Programming language to use" }
        },
        required: ["summary", "approach", "edge_cases", "language"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_code",
      description: "Write or rewrite the implementation. Call this after analyse_task, or again after report_bug to fix issues.",
      parameters: {
        type: "object",
        properties: {
          reasoning: { type: "string", description: "Why you are writing or rewriting this code" },
          code: { type: "string", description: "The full implementation" },
          language: { type: "string", description: "Programming language" }
        },
        required: ["reasoning", "code", "language"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Test the current implementation. Trace through the logic mentally with real inputs. Call this after write_code.",
      parameters: {
        type: "object",
        properties: {
          test_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                input: { type: "string" },
                expected: { type: "string" },
                actual: { type: "string" },
                passed: { type: "boolean" }
              },
              required: ["input", "expected", "actual", "passed"]
            }
          },
          all_passed: { type: "boolean" }
        },
        required: ["test_cases", "all_passed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_bug",
      description: "Report bugs found during testing. Call this when run_tests reveals failures. After this, you MUST call write_code again to fix them.",
      parameters: {
        type: "object",
        properties: {
          bugs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                root_cause: { type: "string" },
                fix: { type: "string" }
              },
              required: ["description", "root_cause", "fix"]
            }
          }
        },
        required: ["bugs"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mission_complete",
      description: "Mark the mission complete. Call ONLY when all tests pass and you are confident the code is correct.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What was built and verified" },
          final_code: { type: "string", description: "The final verified implementation" },
          language: { type: "string" }
        },
        required: ["summary", "final_code", "language"]
      }
    }
  }
];

const SYSTEM = `You are Eclatant — an autonomous coding agent. You receive a task or bug report and solve it completely using your tools.

You are fully autonomous. No one will prompt you to move to the next step. You decide everything.

Your loop:
1. analyse_task — understand the problem, identify edge cases
2. write_code — implement the solution
3. run_tests — trace through your code with real inputs, check every edge case
4. If any test fails: call report_bug, then call write_code to fix — loop back to run_tests
5. When all tests pass: call mission_complete

You are the analyst, the coder, and the tester. Be thorough during testing — actually trace through the logic step by step. If you find a bug, own it and fix it. Never give up. Only call mission_complete when every test genuinely passes.`;

app.post("/api/agent/run", async (req, res) => {
  const { task } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  if (!process.env.GROQ_API_KEY) {
    send({ type: "error", message: "GROQ_API_KEY is not set. Add it to your .env file." });
    res.end();
    return;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: task }
  ];

  const MAX_TURNS = 24;
  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;

    let response;
    try {
      response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4096,
        tools: TOOLS,
        tool_choice: "auto",
        messages
      });
    } catch (err) {
      send({ type: "error", message: err.message });
      break;
    }

    const msg = response.choices[0].message;
    messages.push(msg);

    if (msg.content) {
      send({ type: "thinking", text: msg.content.trim() });
    }

    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      send({ type: "done", status: "complete" });
      break;
    }

    let didComplete = false;

    for (const tc of toolCalls) {
      const name = tc.function.name;
      let args;
      try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

      send({ type: "tool_call", name, input: args, id: tc.id });

      let result = { status: "ok" };

      if (name === "analyse_task") {
        result = { acknowledged: true };
      } else if (name === "write_code") {
        result = { acknowledged: true, code_length: (args.code || "").length };
      } else if (name === "run_tests") {
        const cases = args.test_cases || [];
        result = {
          acknowledged: true,
          passed: cases.filter(t => t.passed).length,
          failed: cases.filter(t => !t.passed).length,
          all_passed: args.all_passed
        };
      } else if (name === "report_bug") {
        result = {
          acknowledged: true,
          bug_count: (args.bugs || []).length,
          instruction: "Fix these bugs now — call write_code with the corrected implementation."
        };
      } else if (name === "mission_complete") {
        send({ type: "done", status: "complete", summary: args.summary, final_code: args.final_code, language: args.language });
        didComplete = true;
        break;
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result)
      });
    }

    if (didComplete) break;
  }

  if (turn >= MAX_TURNS) {
    send({ type: "done", status: "failed", summary: "Max turns reached." });
  }

  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eclatant running on http://localhost:${PORT}`);
});
