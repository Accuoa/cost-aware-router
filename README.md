# cost-aware-router

> **Save ~44% on your LLM bill by sending the easy stuff to your laptop.** OpenAI-compatible proxy that routes simple requests to local Ollama, complex ones to a cloud frontier model. Drop-in: change one URL, see the savings.

[![alpha demo](https://img.shields.io/badge/status-alpha%20demo-orange)](https://accuoa.github.io/cost-aware-router/)

## Headline numbers (from a public benchmark)

On 50 MMLU + 25 HumanEval-JS items, with `qwen2.5:3b` (Ollama) as the local model and `llama-3.3-70b-versatile` (Groq) as the cloud baseline:

- **44% cost savings** vs all-cloud baseline
- **–2.7 pp accuracy delta** — essentially within eval noise on this workload
- **55% of requests stayed local**

Reproduce yourself in ~10 minutes — see [Quickstart](#quickstart). Methodology and per-run numbers in [`calibration.md`](./calibration.md). The 75 benchmark items live in [`benchmark/data/`](./benchmark/data/) so anyone can rerun against the same inputs.

## Quickstart

```bash
git clone https://github.com/Accuoa/cost-aware-router.git
cd cost-aware-router
npm install
ollama pull qwen2.5:3b              # one-time, ~2 GB; install Ollama from ollama.com if needed
echo "GROQ_API_KEY=gsk_..." > .env  # free key at console.groq.com
npm start                           # proxy on :8080
```

In a second terminal:

```bash
export $(grep -v '^#' .env | xargs)
npm run benchmark                   # ~5–10 minutes (rate-limit backoff on Groq's free tier)
```

You'll see the routing decision and cost for each of the 75 items, then a final ROUTING / ACCURACY / COST summary.

(Docker Compose path included for reference but not the documented quick-start — see [USAGE.md](./USAGE.md#docker-compose).)

## How to use it in your app

Change one line in your existing OpenAI-using code:

```diff
- const openai = new OpenAI({ baseURL: 'https://api.openai.com/v1' });
+ const openai = new OpenAI({ baseURL: 'http://localhost:8080/v1' });
```

That's it. Your app keeps working. Simple requests now go to your laptop's Ollama; complex ones still go to the cloud. Inspect the routing per request via the `X-Router-Decision` and `X-Router-Reason` response headers.

## How routing decisions work

The proxy looks at every request and picks `local` or `cloud` based on a transparent heuristic:

- **Force-local keyword present** (configurable per app)? → local
- **Code in the prompt** (markdown fence, `def`/`function`/`class`, SQL)? → cloud
- **Complexity keyword present** ("step by step", "deeply analyze", …)? → cloud
- **Prompt longer than ~200 tokens?** → cloud
- **Otherwise** → local

Every routing decision is logged with a one-word reason. Tunable via [`config.example.yml`](./config.example.yml).

See [USAGE.md](./USAGE.md) for the config reference, [ARCHITECTURE.md](./ARCHITECTURE.md) for how the proxy works internally, and [ROADMAP.md](./ROADMAP.md) for what's next.

## Status

`alpha demo` — the routing logic, eval harness, and demo numbers all work. Production hardening (auth, rate limiting, streaming, multi-tenant) is intentionally out of scope for this alpha. See [ROADMAP.md](./ROADMAP.md).

## License

MIT — see [LICENSE](./LICENSE).
