# Eclatant — autonomous coding agent

submit a task or bug report. the agent autonomously writes code, tests it, fixes it. 

## stack

- **backend** — node.js + express (sse streaming)
- **ai** — groq llama-3.3-70b 
- **frontend** — single html file

## get your free api key 

1. go to **console.groq.com**
2. sign up with google or email
3. click **API Keys** in the left sidebar
4. click **Create API key**
5. copy it

## run

```bash
git clone https://github.com/dtscienc/proje.git
cd eclatant
npm install
cp .env.example .env
# open .env and paste your Groq key in place of: your-groq-api-key-here
npm start
# open http://localhost:3000
```

## how it works

true tool-use agentic loop — the model decides every step autonomously using a set of tools. no scripted prompts between phases. 

1. `analyse_task` — notes edge cases
2. `write_code` — implements the solution
3. `run_tests` — code with real inputs
4. `report_bug` — logs bugs with cause and fix plan
5. `mission_complete` — called only when all tests pass

self-healing loop: if run_tests finds failures, the agent calls report_bug then write_code again — loops until everything passes. up to 24 iterations. 

## env vars

| var | required | default |
|-----|----------|---------|
| `GROQ_API_KEY` | yes — free at console.groq.com | — |
| `PORT` | no | 3000 |
