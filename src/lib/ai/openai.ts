/**
 * OpenAI API helper using fetch (no npm package needed).
 */

interface OpenAIResult {
  content: string;
  tokensUsed: number;
  model: string;
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; maxTokens?: number }
): Promise<OpenAIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada no servidor');
  }

  const model = options?.model || 'gpt-4o-mini';
  const maxTokens = options?.maxTokens || 1000;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    model: data.model || model,
  };
}
