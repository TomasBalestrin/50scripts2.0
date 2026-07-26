/**
 * AI provider client — DeepInfra via its OpenAI-compatible API.
 *
 * DeepInfra exposes an OpenAI-compatible surface, so the request/response
 * shapes for chat and embeddings match OpenAI's; only the base URL, API key
 * and model ids differ. The one incompatibility that bites: DeepInfra uses
 * `max_tokens` (not OpenAI's newer `max_completion_tokens`).
 */

export const AI_BASE_URL = 'https://api.deepinfra.com/v1/openai';

/** Text / chat completions. */
export const TEXT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

/** Embeddings — DeepInfra has no `text-embedding-3-small`; bge-m3 is 1024-dim. */
export const EMBEDDING_MODEL = 'BAAI/bge-m3';
export const EMBEDDING_DIMENSIONS = 1024;

const CHAT_TIMEOUT_MS = 45_000;

/**
 * Resolve a stored/requested model id to one valid on the current provider.
 * DeepInfra ids are namespaced (`org/model`); legacy ids from previous
 * providers (`gpt-4o-mini`, `claude-...`) have no slash and are mapped to the
 * default text model, so stale DB rows in `ai_prompts` can't send an invalid id.
 */
export function resolveTextModel(model?: string | null): string {
  return model && model.includes('/') ? model : TEXT_MODEL;
}

interface AIResult {
  content: string;
  tokensUsed: number;
  model: string;
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; maxTokens?: number }
): Promise<AIResult> {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY não configurada no servidor');
  }

  const model = resolveTextModel(options?.model);
  const maxTokens = options?.maxTokens || 1000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        // DeepInfra uses `max_tokens`, not OpenAI's `max_completion_tokens`.
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`DeepInfra API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
      model: data.model || model,
    };
  } finally {
    clearTimeout(timer);
  }
}
