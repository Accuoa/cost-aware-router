import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadPrices() {
  const raw = readFileSync(join(__dirname, 'pricing.json'), 'utf-8');
  return JSON.parse(raw);
}

// Strip OpenAI date-snapshot suffix so e.g. "gpt-4o-2024-11-20" maps to "gpt-4o".
function normalizeModel(model) {
  if (!model) return model;
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
}

export function calculateCost(prices, model, usage) {
  if (!usage) return 0;
  const p = prices[model] ?? prices[normalizeModel(model)];
  if (!p) return 0;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  return (
    (promptTokens * p.input_per_1m) / 1_000_000 +
    (completionTokens * p.output_per_1m) / 1_000_000
  );
}
