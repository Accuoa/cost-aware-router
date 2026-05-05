import { describe, it, expect } from 'vitest';
import { calculateCost, loadPrices } from '../src/pricing.mjs';

describe('calculateCost', () => {
  const prices = {
    'gpt-4o': { input_per_1m: 2.5, output_per_1m: 10.0 },
    'qwen2.5:3b': { input_per_1m: 0, output_per_1m: 0 },
  };

  it('calculates cost for paid cloud model', () => {
    const cost = calculateCost(prices, 'gpt-4o', { prompt_tokens: 1_000_000, completion_tokens: 0 });
    expect(cost).toBeCloseTo(2.5, 6);
  });

  it('calculates cost for output tokens', () => {
    const cost = calculateCost(prices, 'gpt-4o', { prompt_tokens: 0, completion_tokens: 1_000_000 });
    expect(cost).toBeCloseTo(10.0, 6);
  });

  it('returns 0 for local models', () => {
    const cost = calculateCost(prices, 'qwen2.5:3b', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    });
    expect(cost).toBe(0);
  });

  it('returns 0 for unknown models (fail-soft, log warning suppressed in tests)', () => {
    const cost = calculateCost(prices, 'unknown-model-xyz', {
      prompt_tokens: 100,
      completion_tokens: 50,
    });
    expect(cost).toBe(0);
  });

  it('handles missing usage object', () => {
    expect(calculateCost(prices, 'gpt-4o', undefined)).toBe(0);
    expect(calculateCost(prices, 'gpt-4o', null)).toBe(0);
    expect(calculateCost(prices, 'gpt-4o', {})).toBe(0);
  });

  it('handles partial usage (only prompt or completion)', () => {
    const cost = calculateCost(prices, 'gpt-4o', { prompt_tokens: 100 });
    expect(cost).toBeCloseTo(0.00025, 6);
  });
});

describe('loadPrices', () => {
  it('loads pricing from src/pricing.json', () => {
    const prices = loadPrices();
    expect(prices['gpt-4o']).toEqual({ input_per_1m: 2.5, output_per_1m: 10.0 });
    expect(prices['qwen2.5:3b']).toEqual({ input_per_1m: 0, output_per_1m: 0 });
  });
});
