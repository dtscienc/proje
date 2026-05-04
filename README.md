# Eclatant - autonomous coding agent

submit a task or bug report. the agent autonomously writes code, tests it, fixes it. 

## stack

- **backend** - node.js + express (sse streaming)
- **ai** - groq llama-3.3-70b 
- **frontend** - single html file

## get your free api key 

1. go to **console.groq.com**
2. sign up with google or email
3. click **API Keys** in the left sidebar
4. click **Create API key**

## run

```bash
git clone https://github.com/dtscienc/proje.git
cd proje
npm install
cp .env.example .env
# open .env with notepad .env and paste your Groq key in place of: your-groq-api-key-here and ctrl-s
npm start
# open http://localhost:3000
```

## how it works

true tool-use agentic loop - the model decides every step autonomously using a set of tools. no scripted prompts between phases. 

1. `analyse_task` - notes edge cases
2. `write_code` - implements the solution
3. `run_tests` - code with real inputs
4. `report_bug` - logs bugs with cause and fix plan
5. `mission_complete` - called only when all tests pass

self-healing loop: if run_tests finds failures, the agent calls report_bug then write_code again - loops until everything passes. up to 24 iterations. 

## env vars

| var | required | default |
|-----|----------|---------|
| `GROQ_API_KEY` | yes - free at console.groq.com | - |
| `PORT` | no | 3000 |

troubleshooting
agent returns an error immediately → your GROQ_API_KEY is missing or invalid. check your .env file.

page doesn't load → make sure you ran npm install and the server started without errors.

model errors / rate limits → groq's free tier has rate limits. wait a moment and try again.

Example questions:


Examples:

Easy - Write a function that merges two sorted arrays into a single sorted array 

Medium - Write a rate limiter class that allows N requests per second and queues the rest


Hard - Hard — Bug: my binary search function returns the wrong index when there are duplicate values in the array 
def binary_search(arr, target):
left, right = 0, len(arr) - 1
while left <= right:
mid = (left + right) // 2
if arr[mid] == target:
return mid 
elif arr[mid] < target:
left = mid + 1
else:
right = mid - 1
return -1


# Example with duplicates
arr = [1, 2, 2, 2, 3]
print(binary_search(arr, 2)) 


Note: for bug fixes, must add the code function that includes the error. Otherwise, the system would not work. 

