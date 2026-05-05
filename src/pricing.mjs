import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadPrices() {
  const raw = readFileSync(join(__dirname, 'pricing.json'), 'utf-8');
  return JSON.parse(raw);
}

export function calculateCost(prices, model, usage) {
  if (!usage) return 0;
  const p = prices[model];
  if (!p) return 0;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  return (
    (promptTokens * p.input_per_1m) / 1_000_000 +
    (completionTokens * p.output_per_1m) / 1_000_000
  );
}
