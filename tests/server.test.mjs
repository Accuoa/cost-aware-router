import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server.mjs';

const baseConfig = {
  routing: {
    length_threshold_tokens: 200,
    complexity_keywords: [],
    always_cloud_keywords: [],
    always_local_keywords: [],
  },
  backends: {
    local: { base_url: 'http://localhost:11434/v1', model: 'qwen2.5:3b' },
    cloud: {
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      api_key_env: 'OPENAI_API_KEY',
    },
  },
};

const fakeOllamaResponse = {
  id: 'chatcmpl-1',
  object: 'chat.completion',
  model: 'qwen2.5:3b',
  choices: [{ index: 0, message: { role: 'assistant', content: '4' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
};

const fakeOpenAIResponse = {
  id: 'chatcmpl-2',
  object: 'chat.completion',
  model: 'gpt-4o',
  choices: [
    { index: 0, message: { role: 'assistant', content: 'long reply' }, finish_reason: 'stop' },
  ],
  usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
};

function fakeFetch(targetMatch, response) {
  return async (url) => {
    const isMatch = url.includes(targetMatch);
    return {
      ok: true,
      status: 200,
      json: async () => (isMatch ? response : { error: 'wrong route' }),
      text: async () => '',
    };
  };
}

describe('server POST /v1/chat/completions', () => {
  it('routes short prompts to local and sets X-Router-Decision header', async () => {
    const fetchFn = fakeFetch('11434', fakeOllamaResponse);
    const app = await buildServer({ config: baseConfig, fetchFn });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      payload: { messages: [{ role: 'user', content: 'What is 2+2?' }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-router-decision']).toBe('local');
    expect(res.headers['x-router-reason']).toBe('short_simple');
    expect(JSON.parse(res.body).model).toBe('qwen2.5:3b');

    await app.close();
  });

  it('routes long prompts to cloud and sets X-Router-Decision header', async () => {
    const fetchFn = fakeFetch('api.openai.com', fakeOpenAIResponse);
    const app = await buildServer({
      config: baseConfig,
      fetchFn,
      env: { OPENAI_API_KEY: 'test-key' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      payload: { messages: [{ role: 'user', content: 'word '.repeat(500) }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-router-decision']).toBe('cloud');
    expect(res.headers['x-router-reason']).toMatch(/^long_prompt:/);
    expect(JSON.parse(res.body).model).toBe('gpt-4o');

    await app.close();
  });

  it('rejects non-POST methods on /v1/chat/completions', async () => {
    const app = await buildServer({ config: baseConfig, fetchFn: async () => ({ ok: true }) });
    const res = await app.inject({ method: 'GET', url: '/v1/chat/completions' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('returns 400 when messages array is missing', async () => {
    const app = await buildServer({ config: baseConfig, fetchFn: async () => ({ ok: true }) });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
