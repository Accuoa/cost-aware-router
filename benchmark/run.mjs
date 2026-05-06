#!/usr/bin/env node
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreMMLU, scoreHumanEvalJS } from './score.mjs';
import { loadPrices, calculateCost } from '../src/pricing.mjs';
import { loadConfig } from '../src/config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const config = loadConfig(join(ROOT, 'config.example.yml'));

const PROXY_URL = process.env.PROXY_URL ?? 'http://localhost:8080/v1/chat/completions';
const CLOUD_URL = process.env.CLOUD_URL ?? `${config.backends.cloud.base_url}/chat/completions`;
const prices = loadPrices();

function readJsonl(path) {
  return readFileSync(path, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function buildMmluPrompt(item) {
  return [
    { role: 'system', content: 'Answer with a single letter (A, B, C, or D).' },
    {
      role: 'user',
      content: `${item.question}\n\nA. ${item.choices[0]}\nB. ${item.choices[1]}\nC. ${item.choices[2]}\nD. ${item.choices[3]}`,
    },
  ];
}

function buildHumanEvalPrompt(item) {
  return [
    {
      role: 'system',
      content:
        'Complete the JavaScript function. Output only the function body wrapped in curly braces.',
    },
    { role: 'user', content: item.prompt },
  ];
}

const MAX_RETRIES = 5;

// Detect rate-limit errors: direct 429, or proxy-wrapped 5xx whose body mentions rate limiting
function isRateLimitError(status, body) {
  if (status === 429) return true;
  if (status >= 500 && status < 600 && /rate.?limit|429/i.test(body)) return true;
  return false;
}

async function callTarget(url, body, headers = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const t0 = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    if (res.ok) {
      return {
        body: await res.json(),
        decision: res.headers.get('x-router-decision'),
        reason: res.headers.get('x-router-reason'),
        ms,
      };
    }
    const text = await res.text();
    if (!isRateLimitError(res.status, text) || attempt === MAX_RETRIES) {
      throw new Error(`${url} returned ${res.status}: ${text}`);
    }
    // Backoff: prefer server-suggested Retry-After, else exponential capped at 60s
    const retryAfter = parseFloat(res.headers.get('retry-after')) || 0;
    const backoffSec = Math.max(retryAfter, Math.min(2 ** attempt, 60));
    console.log(`    [retry ${attempt + 1}/${MAX_RETRIES}] ${url.includes('groq') || url.includes('openai') ? 'cloud' : 'proxy'} ${res.status} rate-limited — backing off ${backoffSec.toFixed(1)}s`);
    await new Promise((r) => setTimeout(r, backoffSec * 1000));
  }
}

// Baseline cache — when BASELINE_FILE is set and exists, the all-cloud baseline
// responses are loaded from disk instead of re-calling the cloud API. This lets
// tuning iterations (where only the proxy-side routing changes) skip the cloud
// half of the work entirely. First run with BASELINE_FILE set populates the file.
const BASELINE_FILE = process.env.BASELINE_FILE;
const baselineCache = new Map();
let baselineMode = 'off'; // 'off' | 'replay' | 'capture'

if (BASELINE_FILE) {
  if (existsSync(BASELINE_FILE)) {
    for (const line of readFileSync(BASELINE_FILE, 'utf-8').split('\n').filter(Boolean)) {
      const obj = JSON.parse(line);
      baselineCache.set(obj.id, obj);
    }
    baselineMode = 'replay';
    console.log(
      `[baseline] replaying ${baselineCache.size} cached cloud responses from ${BASELINE_FILE}`,
    );
  } else {
    baselineMode = 'capture';
    console.log(`[baseline] capturing cloud responses to ${BASELINE_FILE}`);
  }
}

async function runItem(target, item, prompt, scorer, id) {
  const requestBody = { messages: prompt, temperature: 0 };
  // PROXY run (used for "with proxy" numbers)
  const proxy = await callTarget(target.proxy.url, requestBody);
  const proxyResponseText = proxy.body.choices?.[0]?.message?.content ?? '';
  const proxyCorrect = scorer(item, proxyResponseText);
  const proxyCost = calculateCost(prices, proxy.body.model, proxy.body.usage);

  // CLOUD-ONLY run (used for "all-cloud" baseline) — replay from cache if available.
  let cloud;
  if (baselineMode === 'replay' && baselineCache.has(id)) {
    cloud = baselineCache.get(id);
  } else {
    cloud = await callTarget(
      target.cloud.url,
      { ...requestBody, model: target.cloud.model },
      { authorization: `Bearer ${target.cloud.apiKey}` },
    );
    if (baselineMode === 'capture') {
      appendFileSync(BASELINE_FILE, JSON.stringify({ id, body: cloud.body, ms: cloud.ms }) + '\n');
    }
  }
  const cloudResponseText = cloud.body.choices?.[0]?.message?.content ?? '';
  const cloudCorrect = scorer(item, cloudResponseText);
  const cloudCost = calculateCost(prices, target.cloud.model, cloud.body.usage);

  return {
    decision: proxy.decision,
    reason: proxy.reason,
    proxy: { correct: proxyCorrect, cost: proxyCost, ms: proxy.ms, model: proxy.body.model },
    cloud: { correct: cloudCorrect, cost: cloudCost, ms: cloud.ms, model: target.cloud.model },
  };
}

function fmt(n, decimals = 4) {
  return n.toFixed(decimals);
}

async function main() {
  const apiKeyEnv = config.backends.cloud.api_key_env;
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    console.error(`${apiKeyEnv} not set`);
    process.exit(1);
  }

  const target = {
    proxy: { url: PROXY_URL },
    cloud: { url: CLOUD_URL, model: config.backends.cloud.model, apiKey },
  };

  const mmlu = readJsonl(join(__dirname, 'data', 'mmlu-50.jsonl'));
  const humaneval = readJsonl(join(__dirname, 'data', 'humaneval-25.jsonl'));
  const items = [
    ...mmlu.map((it) => ({ kind: 'mmlu', item: it, prompt: buildMmluPrompt(it), scorer: scoreMMLU })),
    ...humaneval.map((it) => ({
      kind: 'humaneval',
      item: it,
      prompt: buildHumanEvalPrompt(it),
      scorer: scoreHumanEvalJS,
    })),
  ];

  const total = items.length;
  console.log(`[router] running benchmark — ${total} items`);

  const results = [];
  for (let i = 0; i < items.length; i++) {
    const { kind, item, prompt, scorer } = items[i];
    const id = `${kind}/${item.task_id ?? item.subject + i}`;
    try {
      const r = await runItem(target, item, prompt, scorer, id);
      const decision = r.decision ?? 'unknown';
      const reason = r.reason ?? '';
      console.log(
        `  ${r.proxy.correct ? '✓' : '✗'} ${id.padEnd(34)} ${decision.padEnd(7)} ${reason.padEnd(30)} — ${r.proxy.ms}ms — $${fmt(r.proxy.cost)}`,
      );
      results.push(r);
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}`);
      results.push(null);
    }
  }

  const valid = results.filter(Boolean);
  const localCount = valid.filter((r) => r.decision === 'local').length;
  const cloudCount = valid.filter((r) => r.decision === 'cloud').length;
  const proxyCorrect = valid.filter((r) => r.proxy.correct).length;
  const cloudCorrect = valid.filter((r) => r.cloud.correct).length;
  const proxyCostTotal = valid.reduce((s, r) => s + r.proxy.cost, 0);
  const cloudCostTotal = valid.reduce((s, r) => s + r.cloud.cost, 0);
  const savingsPct = cloudCostTotal > 0
    ? ((cloudCostTotal - proxyCostTotal) / cloudCostTotal) * 100
    : 0;
  const accuracyPp = (proxyCorrect / valid.length - cloudCorrect / valid.length) * 100;

  const dropped = total - valid.length;
  const dropNote = dropped > 0 ? ` (${dropped} errored, excluded from totals)` : '';

  console.log('\nROUTING:');
  console.log(`  local:  ${localCount} / ${valid.length} (${fmt((localCount / valid.length) * 100, 1)}%) — ${config.backends.local.model} via Ollama`);
  console.log(`  cloud:  ${cloudCount} / ${valid.length} (${fmt((cloudCount / valid.length) * 100, 1)}%) — ${config.backends.cloud.model}${dropNote}`);

  console.log('\nACCURACY:');
  console.log(`  with proxy:    ${proxyCorrect} / ${valid.length} (${fmt((proxyCorrect / valid.length) * 100, 1)}%)`);
  console.log(`  all-cloud:     ${cloudCorrect} / ${valid.length} (${fmt((cloudCorrect / valid.length) * 100, 1)}%)`);
  console.log(`  delta:         ${accuracyPp >= 0 ? '+' : ''}${fmt(accuracyPp, 1)} pp`);

  console.log('\nCOST:');
  console.log(`  with proxy:    $${fmt(proxyCostTotal)}`);
  console.log(`  all-cloud:     $${fmt(cloudCostTotal)}`);
  console.log(`  savings:       ${fmt(savingsPct, 1)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
