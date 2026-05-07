# Twitter thread — cost-aware-router launch

> Calibration numbers below were filled from `calibration.md` (Run 3: 44% savings / –2.7 pp delta). Each tweet must still be ≤ 280 chars — verify in Twitter compose before posting.

## Lead tweet (with screenshot of `npm run benchmark` summary block attached)

```
I built a tiny OpenAI-compatible proxy that routes simple requests to a local Ollama model and complex ones to a cloud frontier model.

On a public benchmark (50 MMLU + 25 HumanEval-JS): 44% cost savings, 2.7pp accuracy delta.

~50 lines of routing logic. Drop-in. → 🧵
```

[attach: `launch/screenshots/benchmark-screenshot.png` — the ROUTING / ACCURACY / COST block, rendered via carbon.now.sh]

---

## Tweet 2

```
The problem: apps over-route to frontier models.

A "what's the capital of France" hits the same model as "deeply analyze this 2000-word doc."

You don't pay extra for the second case. You pay for ALL of them at frontier prices.
```

---

## Tweet 3

```
The proxy looks at every request and decides:

→ Has code? cloud
→ "step by step" / "deeply analyze" / etc.? cloud
→ Long prompt (>200 tokens)? cloud
→ Otherwise → local

Every decision is logged with a one-word reason. All thresholds tunable in YAML.
```

---

## Tweet 4

```
Drop-in adoption: change ONE line.

- baseURL: 'https://api.openai.com/v1'
+ baseURL: 'http://localhost:8080/v1'

Your existing OpenAI SDK code keeps working. The proxy speaks the same wire format.
```

---

## Tweet 5

```
Numbers come from a public benchmark anyone can rerun:

• 50 MMLU items (5 subjects × 10)
• 25 HumanEval-JS items
• Cloud baseline: llama-3.3-70b-versatile (Groq)
• Local: qwen2.5:3b via Ollama
• Reproducible with `npm run benchmark`

Methodology: calibration.md
```

---

## Tweet 6 (CTA)

```
What I want:

→ Try it on YOUR workload, file an issue with what worked / didn't
→ If you have an anonymized workload trace, I'd love to test against it
→ Share if it's interesting

Code: github.com/Accuoa/cost-aware-router
Demo: accuoa.github.io/cost-aware-router/
```

---

## Tweet 7 (optional, used as a follow-up at T+24h)

```
Update from launch day:

[Capture top question / interesting comment / unexpected interest signal here on launch day. Replace this template before posting.]
```

---

## Voice notes

- Lead tweet has the strongest hook. Numbers (44%, –2.7 pp) appear in the first 80 chars.
- Each tweet is self-contained — readable if someone joins mid-thread.
- No hashtags except minimally on the asks tweet (and even there, optional).
- Reply-thread style, not standalone posts — Twitter rewards threads in algorithm now.
- Don't tag accounts in the lead tweet; tag relevant folks (e.g., @ollama, @Groq) in tweet 5 if they boost the reach.
- Post 09:00-11:00 ET to catch the US morning + EU afternoon.

## Pre-post checklist

- [x] All calibration placeholders replaced with locked numbers from `calibration.md` (44%, –2.7 pp)
- [ ] Each tweet copy-pasted into Twitter compose, character count verified ≤ 280
- [ ] `launch/screenshots/benchmark-screenshot.png` exists and is legible at Twitter's preview size
- [ ] Lead tweet's image alt-text written (accessibility — describe the routing/accuracy/cost block in 80 chars)
- [ ] Schedule the thread or post live; if scheduling, set reminder for the T+24h follow-up tweet
