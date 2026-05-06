# Architecture

## Big picture

```
                        ┌─────────────────────┐
                        │   user's app code   │
                        │ OpenAI SDK client   │
                        └──────────┬──────────┘
                                   │ POST /v1/chat/completions
                                   ▼
                        ┌─────────────────────┐
                        │   proxy (Fastify)   │
                        │   localhost:8080    │
                        └──────────┬──────────┘
                                   │
                          ┌────────┴────────┐
                          │ routing rule    │
                          │ (length / code  │
                          │  / complexity)  │
                          └────────┬────────┘
                                   │
                       ┌───────────┴────────────┐
                       ▼                        ▼
              ┌─────────────────┐    ┌──────────────────────┐
              │     Ollama      │    │  Groq / OpenAI / ... │
              │ qwen2.5:3b      │    │ llama-3.3-70b-vers.  │
              │ (local, free)   │    │  (cloud, paid)       │
              └─────────────────┘    └──────────────────────┘
```

The user's app keeps its OpenAI SDK code unchanged — it just sets `baseURL` to `http://localhost:8080/v1`. The proxy speaks the same wire format, so no client changes are needed.

## Code structure

```
src/
├── server.mjs           # Fastify app — receives request, forwards to backend
├── router.mjs           # The routing heuristic (the core IP)
├── pricing.mjs          # Cost calculator (handles date-snapshot model names)
├── pricing.json         # Per-model token prices ($ per 1M tokens)
├── config.mjs           # YAML config loader
└── backends/
    ├── ollama.mjs       # Ollama OpenAI-compat client
    └── openai.mjs       # OpenAI-compatible client (works with Groq, OpenRouter, etc.)

benchmark/
├── data/
│   ├── mmlu-50.jsonl       # 50 MMLU items (10 each from 5 subjects)
│   └── humaneval-25.jsonl  # 25 HumanEval-JS items
├── score.mjs            # MMLU + HumanEval-JS scorers (last-letter MMLU; vm-sandboxed JS execution)
└── run.mjs              # Benchmark runner with retry-on-429 backoff
```

## Routing decision tree

```
incoming request → extract user-message text
    │
    ▼
always_local_keywords match?  ── yes → LOCAL  (forced_local:"<keyword>")
    │ no
    ▼
contains code block / def / function / class / SQL?  ── yes → CLOUD (contains_code)
    │ no
    ▼
complexity_keywords or always_cloud_keywords match?  ── yes → CLOUD (complexity_keyword:"...")
    │ no
    ▼
input_tokens > length_threshold_tokens?  ── yes → CLOUD (long_prompt:N_tokens)
    │ no
    ▼
    LOCAL (short_simple)
```

The routing happens before any backend call — the proxy doesn't speculatively call both backends.

## Code detection patterns

The proxy detects code by scanning the user's message for any of these patterns (regex, case-insensitive where relevant):

- ` ``` ` — markdown code fence
- `def \w+(` — Python function
- `function \w+(` or `const \w+ = function(` — JavaScript function
- `class [A-Z]\w*` — class declaration
- `import \w+` or `require(` — imports
- `<html` or `<script` — HTML
- `SELECT ... FROM` — SQL

False positives are conservative — non-code prompts that match these patterns will route to cloud, which is safe (no quality loss, just less savings on those requests). False negatives (code prompts that route local) are the more expensive failure mode for accuracy, so the patterns favor recall over precision.

## Pricing model

`src/pricing.json` is a flat table:

```json
{
  "llama-3.3-70b-versatile": { "input_per_1m": 0.59, "output_per_1m": 0.79 },
  "gpt-4o": { "input_per_1m": 2.5, "output_per_1m": 10.0 },
  "qwen2.5:3b": { "input_per_1m": 0, "output_per_1m": 0 }
}
```

`calculateCost(prices, model, usage)` returns the dollar cost for one response. For unknown model names it returns 0 (fail-soft). Date-snapshot variants like `gpt-4o-2024-11-20` are normalized to their base name (`gpt-4o`) before lookup, so OpenAI's stable-snapshot returns work without pricing-table churn.

## Why this design

**Why a heuristic, not ML?**
ML routing requires training data, evaluation infrastructure, and constant updates as models change. A heuristic is transparent, debuggable, and tunable. Users can read the rules in 60 seconds and reason about why their request went where it did. For an alpha, this is the right tradeoff.

**Why local-first vs multi-cloud?**
The local-first cut has the strongest economic story (Ollama is free; the savings show up immediately, not relative to slightly-cheaper cloud models). Multi-cloud routing is a v0.2 add-on.

**Why OpenAI-compatible API?**
It's the de facto standard. Every existing OpenAI SDK supports `baseURL` override. Users adopt the proxy with a one-line code change.

**Why Fastify?**
Light, fast, well-documented. Same stack as Plan 1's email-capture service in the parent portfolio.

**Why a public benchmark with committed data?**
So that "Z% savings, –Cpp accuracy" isn't just a marketing claim — anyone can `git clone`, `npm run benchmark`, and verify the numbers themselves. The 75 items (50 MMLU + 25 HumanEval-JS) live in `benchmark/data/` as JSONL, transformed once at sourcing time to fit the score harness's `vm.runInNewContext` sandbox.

## What's not here (intentional v0.1 scope)

- Streaming responses (SSE)
- Embeddings, completions, image, audio, fine-tuning endpoints
- Auth, rate limiting, multi-tenant
- ML routing
- Real-time pricing fetch
- Production deployment guide

See [ROADMAP.md](./ROADMAP.md) for what's planned next.
