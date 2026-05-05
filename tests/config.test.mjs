import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.mjs';

let tmpFile;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'config-'));
  tmpFile = join(dir, 'config.yml');
});

describe('loadConfig', () => {
  it('parses a valid YAML config', () => {
    writeFileSync(
      tmpFile,
      `
routing:
  length_threshold_tokens: 150
  complexity_keywords: ["step by step"]
  always_cloud_keywords: []
  always_local_keywords: []
backends:
  local:
    base_url: http://localhost:11434/v1
    model: qwen2.5:3b
  cloud:
    base_url: https://api.openai.com/v1
    model: gpt-4o
    api_key_env: OPENAI_API_KEY
`,
      'utf-8',
    );
    const config = loadConfig(tmpFile);
    expect(config.routing.length_threshold_tokens).toBe(150);
    expect(config.routing.complexity_keywords).toEqual(['step by step']);
    expect(config.backends.local.model).toBe('qwen2.5:3b');
    expect(config.backends.cloud.model).toBe('gpt-4o');
  });

  it('throws when file does not exist', () => {
    expect(() => loadConfig('/nonexistent/path.yml')).toThrow(/config/i);
  });

  it('throws when YAML is malformed', () => {
    writeFileSync(tmpFile, 'routing: {invalid: yaml: here', 'utf-8');
    expect(() => loadConfig(tmpFile)).toThrow();
  });
});
