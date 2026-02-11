import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasValidAccess } from '@/lib/plans/gate';
import { aiConversationSchema } from '@/lib/validations/schemas';
import { chatCompletion } from '@/lib/ai/openai';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 requests per minute per user
  const limited = rateLimit(user.id, 'ai-conversation', { maxRequests: 10, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, niche, preferred_tone')
    .eq('id', user.id)
    .single();

  if (!profile || !hasValidAccess(profile.plan, 'copilot', profile.plan_expires_at)) {
    return NextResponse.json({ error: 'Plano Copilot necessário' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = aiConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { conversation, lead_id } = parsed.data;

  // Fetch lead context, top scripts, and prompt template in parallel
  const [leadResult, topScriptsResult, promptResult] = await Promise.all([
    lead_id
      ? supabase
          .from('leads')
          .select('name, stage, expected_value, conversation_history, notes')
          .eq('id', lead_id)
          .eq('user_id', user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('script_usage')
      .select('script:scripts(title, global_effectiveness)')
      .eq('user_id', user.id)
      .not('effectiveness_rating', 'is', null)
      .order('effectiveness_rating', { ascending: false })
      .limit(3),
    supabase
      .from('ai_prompts')
      .select('id, system_prompt, user_prompt_template, model, max_tokens, temperature')
      .eq('type', 'conversation')
      .eq('is_active', true)
      .single(),
  ]);

  let leadContext = '';
  const lead = leadResult.data;
  if (lead) {
    leadContext = `
Lead: ${lead.name}
Estágio: ${lead.stage}
Valor esperado: R$ ${lead.expected_value || 'não definido'}
Notas: ${lead.notes || 'nenhuma'}
Histórico anterior: ${JSON.stringify(lead.conversation_history || []).slice(0, 500)}`;
  }

  const topScriptsText = topScriptsResult.data
    ?.map((s: Record<string, unknown>) => {
      const script = s.script as { title: string; global_effectiveness: number } | null;
      return script ? `- ${script.title} (${script.global_effectiveness}/5)` : '';
    })
    .filter(Boolean)
    .join('\n') || 'Sem histórico';

  const promptTemplate = promptResult.data;

  const systemPrompt = promptTemplate?.system_prompt ||
    `Você é um copiloto de vendas expert em WhatsApp. Analise a conversa fornecida e ajude o vendedor.

Sua resposta DEVE conter:
1. **Análise**: Identifique o estágio da conversa, sinais de compra/objeções implícitas, tom do lead
2. **Próxima Mensagem (Sugerida)**: A mensagem exata que o vendedor deve enviar agora
3. **Alternativa**: Uma segunda opção de mensagem com abordagem diferente
4. **Gatilhos Identificados**: Pontos-chave da conversa que indicam oportunidade

Seja direto, prático e persuasivo. Use português brasileiro natural.
Tom do vendedor: ${profile.preferred_tone || 'casual'}
Nicho: ${profile.niche || 'geral'}`;

  const userPrompt = `Analise esta conversa de WhatsApp e me diga o que enviar agora:

---CONVERSA---
${conversation}
---FIM---
${leadContext ? `\nContexto do lead:\n${leadContext}` : ''}

Scripts que mais funcionam para mim:
${topScriptsText}`;

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: promptTemplate?.max_tokens || 1500,
    });

    // Log
    await supabase.from('ai_generation_log').insert({
      user_id: user.id,
      prompt_template_id: promptTemplate?.id,
      type: 'conversation',
      input_context: { conversation: conversation.slice(0, 500), lead_id },
      generated_content: result.content,
      model_used: result.model,
      tokens_used: result.tokensUsed,
    });

    return NextResponse.json({ analysis: result.content });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('AI conversation error:', err.message);
    return NextResponse.json({
      error: `Erro ao analisar conversa: ${err.message || 'erro desconhecido'}`,
    }, { status: 500 });
  }
}
