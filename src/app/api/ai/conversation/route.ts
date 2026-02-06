import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import { aiConversationSchema } from '@/lib/validations/schemas';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, niche, preferred_tone')
    .eq('id', user.id)
    .single();

  if (!profile || !hasAccess(profile.plan, 'copilot')) {
    return NextResponse.json({ error: 'Plano Copilot necessário' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = aiConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { conversation, lead_id } = parsed.data;

  // Get lead context if provided
  let leadContext = '';
  if (lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('name, stage, expected_value, conversation_history, notes')
      .eq('id', lead_id)
      .eq('user_id', user.id)
      .single();

    if (lead) {
      leadContext = `
Lead: ${lead.name}
Estágio: ${lead.stage}
Valor esperado: R$ ${lead.expected_value || 'não definido'}
Notas: ${lead.notes || 'nenhuma'}
Histórico anterior: ${JSON.stringify(lead.conversation_history || []).slice(0, 500)}`;
    }
  }

  // Get user's top scripts for context
  const { data: topScripts } = await supabase
    .from('script_usage')
    .select('script:scripts(title, global_effectiveness)')
    .eq('user_id', user.id)
    .not('effectiveness_rating', 'is', null)
    .order('effectiveness_rating', { ascending: false })
    .limit(3);

  const topScriptsText = topScripts
    ?.map((s: Record<string, unknown>) => {
      const script = s.script as { title: string; global_effectiveness: number } | null;
      return script ? `- ${script.title} (${script.global_effectiveness}/5)` : '';
    })
    .filter(Boolean)
    .join('\n') || 'Sem histórico';

  // Get active conversation prompt
  const { data: promptTemplate } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('type', 'conversation')
    .eq('is_active', true)
    .single();

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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: promptTemplate?.model || 'claude-sonnet-4-5-20250929',
      max_tokens: promptTemplate?.max_tokens || 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const generatedContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

    // Log
    await supabase.from('ai_generation_log').insert({
      user_id: user.id,
      prompt_template_id: promptTemplate?.id,
      type: 'conversation',
      input_context: { conversation: conversation.slice(0, 500), lead_id },
      generated_content: generatedContent,
      model_used: promptTemplate?.model || 'claude-sonnet-4-5-20250929',
      tokens_used: tokensUsed,
    });

    return NextResponse.json({ analysis: generatedContent });
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ error: 'Erro ao analisar conversa' }, { status: 500 });
  }
}
