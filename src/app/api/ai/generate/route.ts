import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasValidAccess } from '@/lib/plans/gate';
import { aiGenerateSchema } from '@/lib/validations/schemas';
import { chatCompletion } from '@/lib/ai/openai';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 requests per minute per user
  const limited = rateLimit(user.id, 'ai-generate', { maxRequests: 10, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, ai_credits_remaining, ai_credits_monthly, niche, preferred_tone')
    .eq('id', user.id)
    .single();

  if (!profile || !hasValidAccess(profile.plan, 'premium', profile.plan_expires_at)) {
    return NextResponse.json({ error: 'Plano Premium necessário' }, { status: 403 });
  }

  // Check credits (copilot = unlimited = -1)
  if (profile.ai_credits_monthly !== -1 && profile.ai_credits_remaining <= 0) {
    return NextResponse.json({ error: 'Créditos IA esgotados' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { category_id, context, tone } = parsed.data;

  // Get category, top scripts, and prompt template in parallel
  const [{ data: category }, { data: topScripts }, { data: promptTemplate }] = await Promise.all([
    supabase
      .from('script_categories')
      .select('name, slug')
      .eq('id', category_id)
      .single(),
    supabase
      .from('script_usage')
      .select('script:scripts(title, content, global_effectiveness)')
      .eq('user_id', user.id)
      .not('effectiveness_rating', 'is', null)
      .order('effectiveness_rating', { ascending: false })
      .limit(5),
    supabase
      .from('ai_prompts')
      .select('id, system_prompt, user_prompt_template, model, max_tokens, temperature')
      .eq('type', 'generation')
      .eq('is_active', true)
      .single(),
  ]);

  const userTone = tone || profile.preferred_tone || 'casual';
  const topScriptsContext = topScripts
    ?.map((s: Record<string, unknown>) => {
      const script = s.script as { title: string; content: string; global_effectiveness: number } | null;
      return script ? `- ${script.title} (efetividade: ${script.global_effectiveness})` : '';
    })
    .filter(Boolean)
    .join('\n') || 'Nenhum histórico ainda';

  const systemPrompt = promptTemplate?.system_prompt ||
    `Você é um especialista em vendas pelo WhatsApp. Gere scripts persuasivos, naturais e eficazes.
Regras:
- Escreva em português brasileiro informal/natural
- Use variáveis como {{NOME_LEAD}}, {{MEU_NOME}}, {{MEU_PRODUTO}} etc.
- Seja direto e persuasivo, sem ser agressivo
- Adapte o tom conforme solicitado
- Máximo 300 palavras por script`;

  const userPrompt = `Gere um script de vendas para WhatsApp com as seguintes especificações:

Categoria: ${category?.name || 'Geral'}
Contexto do vendedor: ${context}
Nicho: ${profile.niche || 'Geral'}
Tom desejado: ${userTone}

Scripts que mais funcionam para este vendedor:
${topScriptsContext}

Gere o script pronto para uso, com variáveis {{NOME_LEAD}} e {{MEU_NOME}} onde apropriado.`;

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: promptTemplate?.max_tokens || 1000,
    });

    // Log generation
    await supabase.from('ai_generation_log').insert({
      user_id: user.id,
      prompt_template_id: promptTemplate?.id,
      type: 'generation',
      input_context: { category_id, context, tone: userTone, niche: profile.niche },
      generated_content: result.content,
      model_used: result.model,
      tokens_used: result.tokensUsed,
    });

    // Deduct credit (if not unlimited)
    if (profile.ai_credits_monthly !== -1) {
      await supabase
        .from('profiles')
        .update({ ai_credits_remaining: profile.ai_credits_remaining - 1 })
        .eq('id', user.id);
    }

    return NextResponse.json({
      content: result.content,
      credits_remaining: profile.ai_credits_monthly === -1
        ? -1
        : profile.ai_credits_remaining - 1,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('AI generation error:', err.message);
    return NextResponse.json({
      error: `Erro ao gerar script: ${err.message || 'erro desconhecido'}`,
    }, { status: 500 });
  }
}
