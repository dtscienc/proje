# eclatant — autonomous coding agent

submit a task or bug report. the agent autonomously writes code, tests it, fixes its own bugs, and iterates until complete.

## stack

- **backend** — node.js + express (sse streaming)
- **ai** — groq llama-3.3-70b (FREE — no credit card needed)
- **frontend** — single html file, no build step

## get your free api key (no card required)

1. go to **console.groq.com**
2. sign up with google or email
3. click **API Keys** in the left sidebar
4. click **Create API key**
5. copy it

## run

```bash
git clone https://github.com/YOURNAME/eclatant.git
cd eclatant
npm install
cp .env.example .env
# open .env and paste your Groq key in place of: your-groq-api-key-here
npm start
# open http://localhost:3000
```

## how it works

true tool-use agentic loop — the model decides every step autonomously using a set of tools. no scripted prompts between phases. the server hands the model the tools and gets out of the way.

1. `analyse_task` — breaks down the task, identifies edge cases
2. `write_code` — implements the solution
3. `run_tests` — traces through the code with real inputs
4. `report_bug` — logs bugs with root cause and fix plan
5. `mission_complete` — called only when all tests pass

self-healing loop: if run_tests finds failures, the agent calls report_bug then write_code again — loops until everything passes. up to 24 turns.

## env vars

| var | required | default |
|-----|----------|---------|
| `GROQ_API_KEY` | yes — free at console.groq.com | — |
| `PORT` | no | 3000 |
