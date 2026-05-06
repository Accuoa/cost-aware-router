# Roadmap

## v0.1 (alpha — what's in this repo)

- [x] OpenAI-compatible `POST /v1/chat/completions` proxy
- [x] Length + code + complexity-keyword heuristic routing
- [x] Ollama (local) + OpenAI-compatible cloud backend (Groq, OpenAI, OpenRouter, Together, …)
- [x] Per-request cost calculation and routing-decision logging (`X-Router-Decision`, `X-Router-Reason` headers)
- [x] Public benchmark harness (50 MMLU + 25 HumanEval-JS) with TDD-covered scorers
- [x] YAML config with tunable thresholds and keyword overrides
- [x] Demo: `npm install && ollama pull qwen2.5:3b && npm start`
- [x] Date-snapshot model normalization in pricing (e.g. `gpt-4o-2024-11-20` → `gpt-4o`)
- [x] Retry-with-backoff on 429 rate limits (Groq free-tier friendly)

## v0.2 — likely next (in priority order)

- [ ] **Docker Compose hardening** — single `docker compose up` works end-to-end on Linux/Mac/WSL2 without manual config edits (env-var substitution in `config.mjs` so the same config file works native and containerized)
- [ ] **Streaming responses** (SSE, OpenAI-style) — top requested feature in early feedback
- [ ] **Multi-cloud cloud backend** — route between OpenAI and Anthropic (or Groq and OpenAI) based on per-domain accuracy data
- [ ] **Three-tier routing** — local + cheap-cloud + expensive-cloud (e.g., qwen2.5:3b → Groq Llama 3.1 8B → GPT-4o)
- [ ] **Latency-aware routing** — route to local when latency budget allows, fail over to cloud on local model timeout
- [ ] **Real-time pricing data** — refresh from a registry or HTTP endpoint instead of hardcoded JSON
- [ ] **Per-user / per-tenant config** — multi-tenant deployments with separate routing rules

## v0.3+ — speculative, depends on signal

- [ ] ML-based classifier (replace or supplement the heuristic with a small classifier trained on routing labels)
- [ ] Fallback retry on quality failure (re-run on cloud if local response fails self-check)
- [ ] Admin dashboard / observability surface (Prometheus, OpenTelemetry, basic web UI)
- [ ] Production deployment recipes (Cloudflare Workers, Vercel Edge, AWS Lambda, Fly.io)
- [ ] Embeddings + completions endpoints (full OpenAI API surface)
- [ ] Cost budgets and circuit breakers (cap monthly spend, auto-route to local when over)

What gets prioritized in v0.2 vs v0.3 depends on what the community asks for after the alpha lands. File issues with feature requests.

## What's NOT planned

- Becoming a fork-of-OpenAI-SDK with custom client bindings (the whole point is OpenAI-compatible drop-in)
- Becoming a managed SaaS (it's a primitive, not a product)
- Becoming a model marketplace or catalog
- Built-in fine-tuning workflow
