export async function callOpenAI({ baseUrl, model, apiKey }, request, fetchFn = globalThis.fetch) {
  if (!apiKey) {
    throw new Error('OpenAI api_key not set (check api_key_env in config)');
  }
  const body = { ...request, model };
  const res = await fetchFn(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`openai ${res.status}: ${text}`);
  }
  return await res.json();
}
