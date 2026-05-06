import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, substituteEnvVars } from '../src/config.mjs';

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

  it('substitutes env vars with ${VAR:-default} syntax in YAML before parsing', () => {
    writeFileSync(
      tmpFile,
      `
routing:
  length_threshold_tokens: 200
  complexity_keywords: []
  always_cloud_keywords: []
  always_local_keywords: []
backends:
  local:
    base_url: \${LOCAL_BASE_URL:-http://localhost:11434/v1}
    model: qwen2.5:3b
  cloud:
    base_url: https://api.groq.com/openai/v1
    model: llama-3.3-70b-versatile
    api_key_env: GROQ_API_KEY
`,
      'utf-8',
    );
    // Default applies when env var unset
    const native = loadConfig(tmpFile, {});
    expect(native.backends.local.base_url).toBe('http://localhost:11434/v1');
    // Override applies when env var set
    const containerized = loadConfig(tmpFile, { LOCAL_BASE_URL: 'http://ollama:11434/v1' });
    expect(containerized.backends.local.base_url).toBe('http://ollama:11434/v1');
  });
});

describe('substituteEnvVars', () => {
  it('replaces ${VAR} with the env value', () => {
    expect(substituteEnvVars('a=${X} b', { X: '1' })).toBe('a=1 b');
  });

  it('replaces ${VAR:-default} with the env value when set', () => {
    expect(substituteEnvVars('a=${X:-fallback}', { X: 'real' })).toBe('a=real');
  });

  it('uses default when env var is unset', () => {
    expect(substituteEnvVars('a=${X:-fallback}', {})).toBe('a=fallback');
  });

  it('uses default when env var is empty string', () => {
    expect(substituteEnvVars('a=${X:-fallback}', { X: '' })).toBe('a=fallback');
  });

  it('replaces ${VAR} with empty string when unset and no default', () => {
    expect(substituteEnvVars('a=${X} b', {})).toBe('a= b');
  });

  it('handles multiple substitutions on one line', () => {
    expect(substituteEnvVars('${A:-x}-${B:-y}', { B: 'real' })).toBe('x-real');
  });

  it('does not touch text without substitution patterns', () => {
    expect(substituteEnvVars('plain text $1 $TEST', { TEST: 'x' })).toBe('plain text $1 $TEST');
  });

  it('handles defaults containing colons and slashes (e.g. URLs)', () => {
    expect(substituteEnvVars('${URL:-http://example.com/v1}', {})).toBe('http://example.com/v1');
  });
});
