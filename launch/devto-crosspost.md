---
title: 'Save ~44% on your LLM bill by sending the easy stuff to your laptop'
published: false
description: 'OpenAI-compatible proxy that routes simple requests to local Ollama, complex ones to a cloud frontier model. Drop-in: change one URL, see the savings.'
tags: llm, ai, opensource, ollama
canonical_url: https://accuoa.github.io/cost-aware-router/launch
cover_image: https://asciinema.org/a/[ASCIINEMA_ID].svg
---

> **Note (alpha):** This is a v0.1 alpha. The numbers below come from a public benchmark — your workload will look different. The point of the post is to show the shape of the savings, not to claim a universal number.

I was running a side project that called GPT-4o for everything. One Sunday I opened the OpenAI dashboard and saw an $80 charge for the previous week. I dug into the request logs expecting a runaway loop. What I found was worse: every request was a real user-facing call, and roughly half were trivial. "Format this as JSON." "Is this a question or a statement?" "Pick the better of these two sentences." A 3-billion-parameter model running on my laptop would have answered any of them indistinguishably from GPT-4o. I was paying frontier-model prices for tasks I could have run for free.

That weekend I started thinking about what a cost-aware proxy would look like. **cost-aware-router** is the alpha of what I built.

## The problem: apps over-route to frontier models

Today the default architecture for an LLM-powered app is "pick a model, send everything to it." If you picked GPT-4o, every request — the trivial ones, the genuinely hard ones, and everything in between — pays the same per-token rate. At $2.50 per million input tokens and $10.00 per million output, even a modest app racks up real money on requests that didn't need a frontier model. A chatbot answering "thanks!" hits the same endpoint as one drafting a code review.

The waste compounds. A typical mixed workload — simple acknowledgements, classification calls, the occasional hard reasoning task — sends maybe 40-60% of requests to a tier of model that's overkill for those requests. At even modest volume (~10K requests/day, half of them simple), that's tens of dollars a day going to frontier-tier billing for tasks a small local model would handle just fine. Multiply by every team running an LLM app today.

## Why existing solutions fall short

To be clear: I'm not the first person to notice this. **OpenRouter** does excellent multi-cloud routing — pick a price/quality point across cloud providers — but every option is still a paid cloud call. There's no local primitive in the routing space. **LangChain** exposes provider abstractions but the per-request routing decision is left to you to build. **Self-rolled if-statements** work in principle but drift the moment your prompt distribution shifts; nobody updates them. The common shape of "is this request hard enough to justify cloud, or can my laptop handle it?" doesn't have a clean primitive yet.

None of these are wrong about anything. They're just solving slightly different problems. Cost-aware-router fills the missing slot: a local-first router with a transparent heuristic and a public benchmark you can verify yourself.

## What cost-aware-router is

It's an OpenAI-compatible HTTP proxy. Your existing OpenAI SDK code keeps working — you change one line:

```js
const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'doesnt-matter-the-proxy-handles-it',
});
```

Behind that endpoint, every request goes through a transparent heuristic before hitting a backend:

1. If the prompt has a force-local keyword you configured, it goes local.
2. If it contains code (markdown fences, function definitions, SQL), it goes cloud.
3. If it contains a complexity keyword you configured, it goes cloud.
4. If it's longer than your token threshold, it goes cloud.
5. Otherwise, it goes local.

That's it. Five rules, each tunable in YAML, each surfaced in `X-Router-Decision` and `X-Router-Reason` response headers so you can see why every request went where it did. The local backend is Ollama (any model). The cloud backend is anything OpenAI-compatible — OpenAI, Groq, OpenRouter, Together. You add your own pricing entries; the proxy logs per-request cost so you actually see where the money goes.

## The numbers (from a public benchmark)

On the public benchmark — 50 MMLU items stratified across 5 subjects (high-school world history, college biology, miscellaneous, formal logic, professional psychology) and 25 HumanEval-JS items — the proxy at default config (300-token threshold, contains-code rule, complexity keywords) routed 55% of requests to local Ollama (`qwen2.5:3b`) and 45% to cloud Groq (`llama-3.3-70b-versatile`). The result: **44% cost reduction vs an all-cloud baseline, with a –2.7 pp accuracy delta** — essentially within eval noise on this workload. The accuracy gap was identical at threshold 200 and 300 (the marginal items shifted to local at 300 are easy enough that both models score them the same); the gap widens at higher thresholds where prompts that genuinely strain a 3B model start staying local.

Verbatim runner output (so the numbers in this post are reproducible — clone the repo and `npm run benchmark` verifies them):

```
ROUTING:
  local:  41 / 75 (54.7%) — qwen2.5:3b via Ollama
  cloud:  34 / 75 (45.3%) — llama-3.3-70b-versatile

ACCURACY:
  with proxy:    65 / 75 (86.7%)
  all-cloud:     67 / 75 (89.3%)
  delta:         -2.7 pp

COST:
  with proxy:    $0.0050
  all-cloud:     $0.0090
  savings:       44.4%
```

The full calibration log, including every tuning iteration, lives in [`calibration.md`](https://github.com/Accuoa/cost-aware-router/blob/main/calibration.md). The 75 benchmark items (50 MMLU stratified across 5 subjects + 25 HumanEval-JS) are committed to the repo so anyone can rerun and verify.

Caveats I want to be loud about: this is one workload, not yours. The public benchmark mix is broader than what most apps actually serve. Your routing thresholds will need tuning for your distribution. The whole point of the YAML config is that you can tune it; the numbers in this post are the _default-config_ starting point, not a target.

## What I want from you

- **Try it on your own workload.** Point your OpenAI client at `localhost:8080` and see what fraction of your requests stay local. File an issue with the routing distribution you saw — I'd love a corpus of "what real apps look like."
- **Share a workload trace** (anonymized) if you have one and you can. Real traces are how I'd evaluate the next version of the heuristic. Even ten lines is useful.
- **Argue with the heuristic.** Five rules are not the right answer forever. If you've thought about routing-as-classification and have an opinion on what should be in v0.2, comment on [`ARCHITECTURE.md`](https://github.com/Accuoa/cost-aware-router/blob/main/ARCHITECTURE.md) or open an issue.
- **Tell me what breaks.** Alpha means alpha. If `npm install && npm start` doesn't work on your machine, that's a bug I want to fix.

## Where to find me

GitHub: [@Accuoa](https://github.com/Accuoa) · Twitter: [@AccuoaAgent](https://twitter.com/AccuoaAgent). The fastest way to reach me is a GitHub issue on [cost-aware-router/issues](https://github.com/Accuoa/cost-aware-router/issues). I read everything.
