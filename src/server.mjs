import Fastify from 'fastify';
import { decideRoute } from './router.mjs';
import { callOllama } from './backends/ollama.mjs';
import { callOpenAI } from './backends/openai.mjs';
import { loadPrices, calculateCost } from './pricing.mjs';
import { loadConfig } from './config.mjs';

export async function buildServer({ config, fetchFn = globalThis.fetch, env = process.env }) {
  const fastify = Fastify({ logger: false });
  const prices = loadPrices();

  fastify.post('/v1/chat/completions', async (request, reply) => {
    const body = request.body;
    if (!body || !Array.isArray(body.messages)) {
      reply.code(400);
      return { error: { message: 'messages array required', type: 'invalid_request_error' } };
    }

    const decision = decideRoute(body, config.routing);
    reply.header('X-Router-Decision', decision.target);
    reply.header('X-Router-Reason', decision.reason);

    let response;
    let model;
    if (decision.target === 'local') {
      const backend = config.backends.local;
      model = backend.model;
      response = await callOllama({ baseUrl: backend.base_url, model: backend.model }, body, fetchFn);
    } else {
      const backend = config.backends.cloud;
      model = backend.model;
      const apiKey = env[backend.api_key_env];
      response = await callOpenAI(
        { baseUrl: backend.base_url, model: backend.model, apiKey },
        body,
        fetchFn,
      );
    }

    const cost = calculateCost(prices, model, response.usage);
    // eslint-disable-next-line no-console
    console.log(
      `[router] ${decision.target} ${decision.reason} — ${model} ($${cost.toFixed(4)})`,
    );

    return response;
  });

  return fastify;
}

// CLI entrypoint
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const configPath = process.env.CONFIG_PATH ?? './config.example.yml';
  const config = loadConfig(configPath);
  const app = await buildServer({ config });
  const port = Number(process.env.PORT ?? 8080);
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[router] listening on :${port} (config: ${configPath})`);
}
