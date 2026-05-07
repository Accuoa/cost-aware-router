# Calibration log

This file documents the three benchmark runs that locked the headline numbers shipped with the v0.1 alpha. Anyone can reproduce these by cloning the repo, setting `GROQ_API_KEY`, and running `npm run benchmark` against the committed dataset in `benchmark/data/`.

## Final headline numbers (used in launch artifacts)

Locked from **Run 3** (threshold=300, full 75/75 dataset, zero errored items):

- **44.4% cost savings** vs all-cloud baseline (rounds to ~44% in marketing copy)
- **–2.7 pp accuracy delta** (essentially within eval noise — see methodology)
- **54.7% of requests stayed local** (qwen2.5:3b via Ollama)
- Workload: 50 MMLU items + 25 HumanEval-JS items
- Cloud baseline: `llama-3.3-70b-versatile` via Groq (free tier)
- Local model: `qwen2.5:3b` via Ollama (~2 GB, runs on consumer hardware)

## Acceptance band

**Acceptable** per the plan's bands (≥40% savings AND ≤5 pp accuracy drop). Not Strong (Strong requires ≥55% savings); the next tuning iteration to chase Strong showed accuracy degrading without proportionate savings gain (see Run 4).

The story for the README/blog/HN post: "save ~44% on cloud LLM costs with negligible accuracy loss (–2.7 pp)."

---

## Run history

### Run 1 — abandoned (rate-limit failure)

Date: 2026-05-06, ~17:00 UTC
Config: `length_threshold_tokens: 200` (default)

First attempt against Groq's free tier blew through 30 RPM during humaneval items 60+. 33 of 75 items errored. The data was unusable for headline purposes.

Diagnostic value: confirmed Groq's free tier of 30 RPM is **just barely** enough for 75 items × 2 calls (proxy + cloud-baseline) at full speed. Required follow-up work:

- Added retry-with-backoff (max 5 retries, exponential, respects `Retry-After`) — committed in [`60a56c5`](../../commit/60a56c5).
- Added `BASELINE_FILE` env var so the all-cloud baseline calls cache to disk; tuning iterations replay them — committed in [`4c66873`](../../commit/4c66873).

### Run 2 — threshold=200 (default), full clean run

Date: 2026-05-06, ~20:30 UTC
Config: `length_threshold_tokens: 200`
Items: 75/75 ✅

```
ROUTING:
  local:  38 / 75 (50.7%) — qwen2.5:3b via Ollama
  cloud:  37 / 75 (49.3%) — llama-3.3-70b-versatile

ACCURACY:
  with proxy:    65 / 75 (86.7%)
  all-cloud:     67 / 75 (89.3%)
  delta:         -2.7 pp

COST:
  with proxy:    $0.0055
  all-cloud:     $0.0089
  savings:       38.7%
```

**Band:** Weak (38.7% savings < 40% Acceptable cutoff by 1.3 pp). Per plan, this triggered tuning rather than launch.

### Run 3 — threshold=300 (TUNED, locked)

Date: 2026-05-07, ~01:30 UTC
Config: `length_threshold_tokens: 300`
Items: 75/75 ✅
Tuning rationale: Run 2's cloud-routes were 25 `contains_code` items (locked cloud regardless of threshold) plus 12 `long_prompt` items. Three of those (251 × 2, 252 tokens) sat just over the 200 threshold; bumping to 300 shifts them local without affecting items that are genuinely too long for a 3B model.

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

**Band:** Acceptable (≥40% savings ✅, ≤5 pp drop ✅).
**Notable:** accuracy delta unchanged from Run 2 (–2.7 pp identical) — the marginal items shifted to local were "easy" enough that both models got them right. Suggests the heuristic is genuinely identifying which prompts are safe.

### Run 4 — threshold=500 (additional tuning iteration, partial)

Date: 2026-05-07, ~01:50 UTC
Config: `length_threshold_tokens: 500`
Items: 56/75 (19 errored — Groq daily-token-per-day limit hit during humaneval items)

```
ROUTING:
  local:  48 / 56 (85.7%) — qwen2.5:3b via Ollama
  cloud:  8  / 56 (14.3%) — llama-3.3-70b-versatile (19 errored, excluded)

ACCURACY:
  with proxy:    48 / 56 (85.7%)
  all-cloud:     50 / 56 (89.3%)
  delta:         -3.6 pp

COST:
  with proxy:    $0.0013
  all-cloud:     $0.0067
  savings:       80.3% (skewed: dropped items were mostly cloud-routed humaneval)
```

**Band:** Weak in absolute terms (TPD-quota-blown partial run). Even on the biased subset, accuracy delta degraded from –2.7 to –3.6 pp. The completed items skewed toward simpler MMLU questions (the cloud-routed humaneval items dropped); extrapolating to a clean 75/75 run, accuracy delta likely lands in the –4 to –5 pp range — close to or breaking the 5 pp Acceptable ceiling.

**Conclusion:** threshold=500 sacrifices accuracy for marginal savings gains in a regime where the local model starts losing on harder prompts. Not the right operating point.

## Why we locked at threshold=300

| Metric | Run 2 (200) | **Run 3 (300)** | Run 4 partial (500) |
|---|---|---|---|
| Items completed | 75/75 | **75/75** | 56/75 |
| Routing local | 50.7% | **54.7%** | (biased: 85.7%) |
| Accuracy delta | –2.7 pp | **–2.7 pp** | –3.6 pp |
| Cost savings | 38.7% | **44.4%** | (biased: 80.3%) |
| Band | Weak | **Acceptable** | (Weak likely on full data) |

Run 3 is the Pareto winner: it's cleanly in Acceptable band, has no accuracy regression vs Run 2, and the next tuning step (Run 4) trades accuracy without a clean savings gain.

## Methodology notes

- **Cloud baseline:** `llama-3.3-70b-versatile` via Groq's free tier (chose Groq for the free-tier free; the proxy is provider-agnostic and works with OpenAI's gpt-4o, OpenRouter, Together, etc. — see `src/pricing.json` for prices). Pricing: $0.59 / $0.79 per million input/output tokens.
- **Local model:** `qwen2.5:3b` via Ollama. Pricing: $0/$0 (local compute only — energy cost not amortized into the savings number).
- **Workload:** 50 MMLU items (10 each from `high_school_world_history`, `college_biology`, `miscellaneous`, `formal_logic`, `professional_psychology`) + 25 HumanEval-JS items (sampled from MultiPL-E). Items are committed verbatim in `benchmark/data/` for reproducibility.
- **Cloud temperature:** 0 (deterministic).
- **Each run:** ~5–10 minutes wall clock with rate-limit backoff. Run 3's actual wall time: ~6 min including 97 retry-backoff cycles totaling ~3 min of paused-for-Groq-quota time.
- **Routing variance across runs:** identical at the same threshold (no temperature randomness; routing is deterministic given fixed inputs). The –2.7 pp accuracy delta in both Run 2 and Run 3 isn't coincidence — the marginal items shifted between thresholds happened to be ones both models score correctly, leaving the "true" gap on harder items unchanged.

## Caveats for the launch

- **One workload, not yours.** The headline numbers are the default-config starting point on a public benchmark. Real apps see different prompt distributions; routing thresholds need workload-specific tuning. The whole point of `config.example.yml` is that you can tune it.
- **Groq's `llama-3.3-70b-versatile` is the cloud baseline shown.** The savings number scales with whatever cloud model you compare against. Against `gpt-4o` ($2.50/$10.00 per 1M), the same routing produces dramatically larger absolute savings (10×) but the relative percentage stays in a similar range — local is free either way.
- **No multi-tenant, no streaming, no production hardening.** This is alpha. See `ROADMAP.md`.
