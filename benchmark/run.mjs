#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreMMLU, scoreHumanEvalJS } from './score.mjs';
import { loadPrices, calculateCost } from '../src/pricing.mjs';
import { loadConfig } from '../src/config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const PROXY_URL = process.env.PROXY_URL ?? 'http://localhost:8080/v1/chat/completions';
const CLOUD_URL = process.env.CLOUD_URL ?? 'https://api.openai.com/v1/chat/completions';

const config = loadConfig(join(ROOT, 'config.example.yml'));
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

async function callTarget(url, body, headers = {}) {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${url} returned ${res.status}: ${text}`);
  }
  return {
    body: await res.json(),
    decision: res.headers.get('x-router-decision'),
    reason: res.headers.get('x-router-reason'),
    ms,
  };
}

async function runItem(target, item, prompt, scorer) {
  const requestBody = { messages: prompt, temperature: 0 };
  // PROXY run (used for "with proxy" numbers)
  const proxy = await callTarget(target.proxy.url, requestBody);
  const proxyResponseText = proxy.body.choices?.[0]?.message?.content ?? '';
  const proxyCorrect = scorer(item, proxyResponseText);
  const proxyCost = calculateCost(prices, proxy.body.model, proxy.body.usage);

  // CLOUD-ONLY run (used for "all-cloud" baseline)
  const cloud = await callTarget(target.cloud.url, { ...requestBody, model: target.cloud.model }, {
    authorization: `Bearer ${target.cloud.apiKey}`,
  });
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set');
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
    try {
      const r = await runItem(target, item, prompt, scorer);
      const id = `${kind}/${item.task_id ?? item.subject + i}`;
      console.log(
        `  ${r.proxy.correct ? '✓' : '✗'} ${id.padEnd(28)} ${r.decision} ${r.reason.padEnd(30)} — ${r.proxy.ms}ms — $${fmt(r.proxy.cost)}`,
      );
      results.push(r);
    } catch (err) {
      console.error(`  ✗ ${kind}/${i}: ${err.message}`);
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

  console.log('\nROUTING:');
  console.log(`  local:  ${localCount} / ${valid.length} (${fmt((localCount / valid.length) * 100, 1)}%) — ${config.backends.local.model} via Ollama`);
  console.log(`  cloud:  ${cloudCount} / ${valid.length} (${fmt((cloudCount / valid.length) * 100, 1)}%) — ${config.backends.cloud.model}`);

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
