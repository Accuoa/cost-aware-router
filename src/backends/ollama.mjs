export async function callOllama({ baseUrl, model }, request, fetchFn = globalThis.fetch) {
  const body = { ...request, model };
  const res = await fetchFn(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ollama ${res.status}: ${text}`);
  }
  return await res.json();
}
