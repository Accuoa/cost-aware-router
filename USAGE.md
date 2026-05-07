# Usage

## Configuration

The proxy reads its config from `config.example.yml` by default. Override with the `CONFIG_PATH` env var.

### Routing knobs

```yaml
routing:
  length_threshold_tokens: 200 # prompts longer than this → cloud
  complexity_keywords: # phrases that force cloud routing
    - 'step by step'
    - 'deeply analyze'
    - 'thoroughly explain'
    # ... add your own
  always_cloud_keywords: [] # extra "always cloud" phrases (case-insensitive)
  always_local_keywords: [] # phrases that force local even if other rules say cloud
```

### Backend selection

```yaml
backends:
  local:
    base_url: http://localhost:11434/v1 # any OpenAI-compatible local server
    model: qwen2.5:3b # any model Ollama supports
  cloud:
    base_url: https://api.groq.com/openai/v1
    model: llama-3.3-70b-versatile # any OpenAI-compatible model
    api_key_env: GROQ_API_KEY # env var name (not the key itself)
```

The cloud backend is provider-agnostic — anything that speaks the OpenAI `/v1/chat/completions` shape works. Verified providers: **Groq**, **OpenAI** (gpt-4o, gpt-4o-mini), **OpenRouter**, **Together.ai**. To switch providers, change three lines: `base_url`, `model`, and `api_key_env`. Add the model's pricing to `src/pricing.json` so cost numbers show up correctly.

For local backends, swap `qwen2.5:3b` for any Ollama model (`qwen2.5:7b`, `llama3.2:3b`, `phi-3-mini`, etc.) — bigger models = better local accuracy = less reason to route cloud.

## Tuning for your workload

The defaults are calibrated for a generic mixed workload (MMLU + HumanEval). Your real workload is different. Tune iteratively:

1. Set `length_threshold_tokens` **lower** if you want MORE requests to go to cloud (safer accuracy, less savings).
2. Set it **higher** if you want MORE requests to stay local (bigger savings, more accuracy risk).
3. Add `complexity_keywords` for phrases that signal "hard request" in your domain.
4. Add `always_local_keywords` for prompts that should never go to cloud (privacy, cost, latency).

Inspect routing decisions in real time:

- Response header `X-Router-Decision: local | cloud`
- Response header `X-Router-Reason: short_simple | contains_code | complexity_keyword:"..." | long_prompt:N_tokens`
- Stdout log line per request: `[router] cloud long_prompt:715_tokens — llama-3.3-70b-versatile ($0.0002)`

## Quick start (native)

The recommended path. Requires Node 20+ and [Ollama for your OS](https://ollama.com/download).

```bash
ollama pull qwen2.5:3b              # one-time, ~2 GB
npm install
echo "GROQ_API_KEY=gsk_..." > .env  # get a free key at console.groq.com
npm start                           # proxy on :8080
```

In a second terminal:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}'
# response includes X-Router-Decision: local
```

## Reproducing the headline numbers

The benchmark uses 75 committed items (`benchmark/data/`). Anyone can clone-and-rerun:

```bash
export $(grep -v '^#' .env | xargs)   # load GROQ_API_KEY
npm run benchmark                     # ~5-10 minutes
```

The runner makes 150 HTTP calls (75 proxy + 75 cloud-baseline). On Groq's free tier (30 RPM, 100K TPD), the run takes ~5–10 minutes with rate-limit backoff. The runner retries on 429 with exponential backoff (max 5 retries per item).

### Baseline cache (for tuning iterations)

When tuning the routing heuristic, you re-run the benchmark multiple times changing only the proxy-side routing config. The cloud-baseline calls don't change between runs — they're identical inputs at temperature=0. Cache them to disk to avoid re-spending cloud quota on every tuning iteration:

```bash
# First run: capture cloud baselines while running normally
BASELINE_FILE=benchmark/baseline.jsonl npm run benchmark

# Subsequent runs (different routing thresholds): replay cached baselines, only proxy is called fresh
BASELINE_FILE=benchmark/baseline.jsonl npm run benchmark   # ~half the wall-clock, zero new cloud spend
```

`benchmark/baseline*.jsonl` is gitignored — these are runtime captures, not committed artifacts.

### Quick smoke run with `LIMIT`

For development against a small subset (iterating on the runner, not the routing config):

```bash
LIMIT=5 npm run benchmark   # runs only the first 5 items
```

Combine with `BASELINE_FILE` for the cheapest possible feedback loop while you're iterating on the codebase.

Output ends with the canonical block:

```
ROUTING:
  local:  X / 75 (X%) — qwen2.5:3b via Ollama
  cloud:  Y / 75 (Y%) — llama-3.3-70b-versatile

ACCURACY:
  with proxy:    A / 75 (A%)
  all-cloud:     B / 75 (B%)
  delta:         -Cpp

COST:
  with proxy:    $X.XX
  all-cloud:     $Y.YY
  savings:       Z%
```

## Docker Compose

The repository includes a `docker-compose.yml` that packages Ollama + the proxy. As of the v0.1 alpha, the compose stack is included for reference but is **not the documented quick-start path** — the native flow is faster on dev machines and avoids a Docker Desktop / WSL2 dependency. See [ROADMAP.md](./ROADMAP.md) for plans to harden the compose path (single-command end-to-end without manual config edits).

## Limitations (alpha)

- Only `POST /v1/chat/completions`. No streaming, embeddings, completions, fine-tuning, audio, or vision-output endpoints.
- Single-tenant. No auth, rate limiting, or per-user accounting.
- Local model must be pre-pulled (`ollama pull qwen2.5:3b`).
- Cloud routing assumes the `model` field comes back in the response body — true for OpenAI/Groq/most providers, may need adjustment for niche endpoints.
- Date-snapshot model names (e.g. `gpt-4o-2024-11-20`) are normalized to their base name for pricing lookup; non-OpenAI date suffixes may need pricing-table entries.
