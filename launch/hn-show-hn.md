# HN Show HN draft — cost-aware-router

## Title

```
Show HN: Cost-aware LLM router – ~44% savings on a public benchmark
```

(Title rules: HN allows up to 80 chars. Lead with "Show HN:". Lead with the concrete number after substitution. No emoji. No editorialization. Don't oversell — HN downvotes hyperbole.)

## URL

```
https://github.com/Accuoa/cost-aware-router
```

## Body text (optional but recommended)

```
Hi HN,

I built an OpenAI-compatible proxy that decides per-request whether to send to local Ollama or to a cloud frontier model. The decision is a transparent heuristic: code in the prompt → cloud, complexity keywords ("step by step", "deeply analyze") → cloud, long prompts → cloud, otherwise local.

On a public benchmark (50 MMLU + 25 HumanEval-JS items): 44% cost savings vs an all-cloud baseline, 2.7pp accuracy delta. Numbers and methodology committed to the repo (calibration.md). Anyone can clone and rerun against the same 75 items.

Adoption is one line: change baseURL from api.openai.com/v1 (or your provider's URL) to localhost:8080/v1. Existing OpenAI SDK code keeps working.

What's NOT in this alpha: streaming, embeddings, multi-tenant, auth. Just /v1/chat/completions. The roadmap has the full v0.2 list, with Docker Compose hardening and streaming as the top items.

Worth flagging: the cloud baseline in this run was Groq's llama-3.3-70b-versatile (chose it for the free tier; the proxy is provider-agnostic). The framing "save ~44% vs cloud" applies to whatever provider you point it at — pricing entries for OpenAI's gpt-4o and gpt-4o-mini are also in pricing.json, the savings vs gpt-4o would be larger.

What I want from this post:
- Real-world workload tries (file issues with what worked or didn't)
- Anonymized workload traces I can run the benchmark against
- Feedback on the heuristic (is the length threshold right? am I missing obvious complexity signals?)

Code: https://github.com/Accuoa/cost-aware-router
Live demo + landing: https://accuoa.github.io/cost-aware-router/

Happy to answer questions.
```

---

## When to submit

Day 1 Tuesday of launch week, **09:00–10:00 ET**. Tuesday–Thursday are HN's highest-traffic days. Don't post on Friday–Monday — your post buried in low-traffic windows.

## Engagement plan (first 2 hours)

- **T+0min:** Post submitted. Refresh the page. Submit a top-level reply confirming "I'll be here for the next 2 hours to answer questions."
- **T+15min:** First comments arrive. Reply to all of them, even the snarky ones. Tone: calm, factual, concede where wrong, link to specifics.
- **T+30–60min:** Watch for the "but does it actually work on real workloads" question (it WILL come). Have a prepared response: "Honest answer: I tested on a public benchmark, not a real workload yet. If you have one I can test against, I'd love that — file an issue." Don't bluff.
- **T+60–120min:** Engagement should peak. Keep replying. Keep replies short. Don't rate-limit yourself out of the conversation.

## Anticipated questions + prepared responses

**"Why not just use OpenRouter?"**
Fair — OpenRouter is great for multi-cloud routing. The local primitive is the differentiator. If your goal is "find the cheapest cloud," OpenRouter wins. If your goal is "send the trivially-easy stuff to free local compute and only pay for the hard stuff," that's what this is for.

**"Your local model is much weaker than GPT-4o, isn't this just sandbagging accuracy?"**
The accuracy-delta number (2.7pp) is exactly what we measure to expose this. If the gap is too wide for your workload, the threshold knob fixes it (lower threshold → more cloud routes → smaller gap). Default config is one point on that curve, not the only point.

**"Why a heuristic and not ML?"**
ML routing requires training data and ongoing maintenance. A heuristic is debuggable in 60 seconds. For an alpha, it's the right tradeoff. v0.3 has an ML-classifier item in case the heuristic ceiling is real.

**"Have you compared to LangChain/LiteLLM/etc.?"**
LangChain has provider abstractions but no per-request routing primitive — you'd build the routing yourself. LiteLLM is closest in spirit but is also cloud-only (no local primitive). Listed in `ROADMAP.md → "Why existing solutions fall short."`

## What to NOT do

- Don't reply with "thanks!" to compliments (waste of comment space)
- Don't argue with negative comments (concede or politely disagree, never escalate)
- Don't post benchmarks as PNGs in comments (HN doesn't render images; use text)
- Don't ask people to upvote or "share if you like it" (instant downvote magnet)
- Don't link to a sales page or pricing — there isn't one, and people will assume you're hiding one

## Pre-post checklist

- [x] Calibration placeholders replaced with locked numbers from `calibration.md` (44% savings, –2.7 pp delta)
- [ ] Title length verified ≤ 80 chars (HN limit)
- [ ] Repo URL resolves; README first 5 lines have the headline numbers and a link to calibration.md
- [ ] `calibration.md` published at the URL referenced in the body
- [ ] Live demo URL (`accuoa.github.io/cost-aware-router/`) renders correctly with no broken links
- [ ] You're free for 2 hours after submission to respond to comments
- [ ] Phone notifications on for HN replies (download the iOS/Android client if you don't have it)
