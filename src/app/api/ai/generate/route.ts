import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import { aiGenerateSchema } from '@/lib/validations/schemas';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, ai_credits_remaining, ai_credits_monthly, niche, preferred_tone')
    .eq('id', user.id)
    .single();

  if (!profile || !hasAccess(profile.plan, 'premium')) {
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

  // Get category info
  const { data: category } = await supabase
    .from('script_categories')
    .select('name, slug')
    .eq('id', category_id)
    .single();

  // Get user's top scripts for context enrichment
  const { data: topScripts } = await supabase
    .from('script_usage')
    .select('script:scripts(title, content, global_effectiveness)')
    .eq('user_id', user.id)
    .not('effectiveness_rating', 'is', null)
    .order('effectiveness_rating', { ascending: false })
    .limit(5);

  // Get active AI prompt template
  const { data: promptTemplate } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('type', 'generation')
    .eq('is_active', true)
    .single();

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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: promptTemplate?.model || 'claude-sonnet-4-5-20250929',
      max_tokens: promptTemplate?.max_tokens || 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const generatedContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

    // Log generation
    await supabase.from('ai_generation_log').insert({
      user_id: user.id,
      prompt_template_id: promptTemplate?.id,
      type: 'generation',
      input_context: { category_id, context, tone: userTone, niche: profile.niche },
      generated_content: generatedContent,
      model_used: promptTemplate?.model || 'claude-sonnet-4-5-20250929',
      tokens_used: tokensUsed,
    });

    // Deduct credit (if not unlimited)
    if (profile.ai_credits_monthly !== -1) {
      await supabase
        .from('profiles')
        .update({ ai_credits_remaining: profile.ai_credits_remaining - 1 })
        .eq('id', user.id);
    }

    return NextResponse.json({
      content: generatedContent,
      credits_remaining: profile.ai_credits_monthly === -1
        ? -1
        : profile.ai_credits_remaining - 1,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Erro ao gerar script' }, { status: 500 });
  }
}
