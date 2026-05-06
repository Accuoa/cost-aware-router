# Demo recording script

This is the runbook for T15 (record the launch demo). The plan's default path uses asciinema, which on Windows requires WSL. Since WSL is currently disabled on this machine, the **screen-recorder + YouTube** path is the working alternative — both produce an embeddable demo URL.

The shipped landing page renders `hero.demoVideoUrl` as an iframe, so any service that gives you an iframe-embeddable URL works (asciinema, YouTube, Vimeo, Loom, …).

## Two paths — pick one

### Path A — screen recorder + YouTube (recommended on Windows)

Tools: built-in **Win + G** (Game Bar) for capture, or OBS Studio for nicer control.

1. **Open Win + G**, click the round record button. (Or open OBS, set up a window-source capture pointing at PowerShell, click "Start Recording.")
2. Run the recording sequence below.
3. Stop the recording. The MP4 lands in `~/Videos/Captures/` (Game Bar) or your configured OBS output dir.
4. Upload to YouTube as **Unlisted**. Get the share URL → convert to embed: `https://www.youtube.com/embed/VIDEO_ID`.
5. Drop the embed URL into `docs/src/content.example.json` `hero.demoVideoUrl`.

Pros: no WSL dependency. YouTube does the iframe-able hosting for free.
Cons: bigger file, needs a YouTube account.

### Path B — asciinema (after WSL is fixed)

Tools: WSL Ubuntu + `sudo apt install asciinema`.

1. `wsl` to enter Ubuntu.
2. `cd /mnt/c/Users/aiden/Documents/portfolio-scaffolds/cost-aware-router`
3. `asciinema rec demo/benchmark.cast --title "cost-aware-router benchmark" --idle-time-limit 1.5`
4. Run the recording sequence below.
5. Type `exit` to stop the recording.
6. `asciinema upload demo/benchmark.cast` → outputs URL like `https://asciinema.org/a/abc123`.
7. Set `hero.demoVideoUrl` to `https://asciinema.org/a/abc123/iframe` (note the `/iframe` suffix — that's the player URL the landing page expects).

Pros: tiny file (~10KB), text-based, works inline on dev.to.
Cons: needs WSL.

## Pre-recording setup (do BEFORE you hit record)

Run these commands in a terminal — verify each works, THEN start recording:

```bash
cd C:/Users/aiden/Documents/portfolio-scaffolds/cost-aware-router

# 1. Confirm Ollama is up and qwen2.5:3b is pulled
ollama list | grep "qwen2.5:3b"
# expected: a line showing qwen2.5:3b

# 2. Warm Ollama with a single tiny call so the model is in memory
#    (otherwise the first benchmark item takes 5-10s for cold load)
curl -s -o NUL http://localhost:11434/api/generate -d '{"model":"qwen2.5:3b","prompt":"hi","stream":false}'

# 3. Confirm GROQ_API_KEY is in .env
grep -q "^GROQ_API_KEY=gsk_" .env && echo "key OK" || echo "MISSING — add GROQ_API_KEY to .env"

# 4. Start the proxy in a SEPARATE terminal window so it stays running through the recording
#    (in terminal #2):
#    export $(grep -v '^#' .env | xargs)
#    npm start
#    Wait for "[router] listening on :8080" before continuing

# 5. Confirm the proxy responds
curl -s -o NUL -w "%{http_code}\n" http://localhost:8080/v1/chat/completions -X POST
# expected: 400 (no body — that's fine, proves the server is up)
```

Once all five checks pass, you're ready to record.

## Recording sequence (the actual demo, ~60s target)

The recording starts in terminal #1 (terminal #2 stays running with the proxy off-screen). Show:

```bash
# --- Frame 1: prove the system is up (~5s) ---
echo "$ ollama list"
ollama list

echo "$ curl -s http://localhost:8080/healthz || echo 'proxy on :8080 (no healthz, but it routes)'"
curl -s http://localhost:8080/healthz || echo 'proxy on :8080 (no healthz, but it routes)'


# --- Frame 2: show one routed request live (~10s) ---
echo "$ # Short prompt → routes local"
echo '$ curl -X POST http://localhost:8080/v1/chat/completions -d ...'
curl -i -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}' \
  | head -20


# --- Frame 3: show a code prompt → routes cloud (~10s) ---
echo ""
echo "$ # Code prompt → routes cloud"
curl -i -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Fix this:\n```js\nconst x =\n```"}]}' \
  | head -20


# --- Frame 4: kick off the benchmark (~30-40s; this is what idle-time-limit speeds up) ---
echo ""
echo "$ npm run benchmark"
export $(grep -v '^#' .env | xargs)
BASELINE_FILE=benchmark/baseline.jsonl npm run benchmark


# Wait for the ROUTING / ACCURACY / COST summary block to appear, then stop the recording.
```

The viewer's takeaway after ~60 seconds: *one drop-in proxy, transparent routing, real benchmark numbers from public data.*

## Post-recording

1. **Upload** (Path A: YouTube unlisted; Path B: `asciinema upload`).
2. **Get the iframe URL.** Format: YouTube → `https://www.youtube.com/embed/VIDEO_ID` · asciinema → `https://asciinema.org/a/<id>/iframe`.
3. **Update `docs/src/content.example.json`:**
   ```json
   "hero": {
     "headline": "Save ~[SAVINGS_PCT]% on your LLM bill by sending the easy stuff to your laptop.",
     "demoVideoUrl": "https://www.youtube.com/embed/VIDEO_ID"
   }
   ```
4. **Rebuild + verify the embed renders:**
   ```bash
   cd docs && npm run build
   grep "hero-demo" dist/index.html | head -3
   ```
   Expected: built HTML contains `data-testid="hero-demo"` with iframe pointing at the embed URL.
5. **Commit:**
   ```bash
   cd ..
   git add demo/ docs/src/content.example.json
   git commit -m "feat(demo): record benchmark cast and embed in landing"
   ```

(If you used Path A and want the recording committed, save it as `demo/benchmark.mp4` first. Note: a few-MB MP4 is fine for a portfolio repo, but if the file is large, `git lfs` or a separate hosting link is the better answer.)

## Common pitfalls

- **Recording is too long.** Target 60s. If your run takes 5+ minutes (e.g., Groq rate-limit backoff), re-record with `BASELINE_FILE=benchmark/baseline.jsonl` already populated — replay is much faster.
- **Recording is too fast.** If your run is <30s the viewer can't follow what's happening. Add `sleep 1` between frames.
- **Cold local model.** First call to qwen2.5:3b after a long idle takes 5–10s. The pre-recording warm-up call avoids this — don't skip it.
- **Terminal font is small.** Bump terminal font size to 16-18pt before recording; legibility on YouTube/asciinema is the difference between someone watching and someone bouncing.
- **Audio.** Don't record audio for the demo — it's text-on-terminal. Distracting and locks viewers into the language. Keep it silent.
