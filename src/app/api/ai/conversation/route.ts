import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import { chatCompletion } from '@/lib/ai/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, niche, preferred_tone')
      .eq('id', user.id)
      .single();

    if (!profile || !hasAccess(profile.plan, 'copilot')) {
      return NextResponse.json({ error: 'Plano insuficiente' }, { status: 403 });
    }

    const body = await request.json();
    const { conversation } = body;

    if (!conversation || typeof conversation !== 'string') {
      return NextResponse.json({ error: 'Conversa é obrigatória' }, { status: 400 });
    }

    // Get the conversation prompt template
    const { data: prompt } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('type', 'conversation')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const systemPrompt = prompt?.system_prompt || `Você é um copiloto de vendas expert em WhatsApp. Analise a conversa fornecida e retorne:

1. **Análise**: O que está acontecendo na conversa
2. **Estágio detectado**: Em que ponto do funil o lead está
3. **Mensagem sugerida**: Uma resposta pronta para enviar
4. **Alternativa**: Uma segunda opção de resposta
5. **Gatilhos identificados**: Pontos de oportunidade

Nicho do usuário: ${profile.niche || 'geral'}
Tom preferido: ${profile.preferred_tone || 'casual'}`;

    const result = await chatCompletion(systemPrompt, conversation, {
      model: prompt?.model || 'gpt-4o-mini',
      maxTokens: prompt?.max_tokens || 1500,
    });

    // Log the generation
    await supabase.from('ai_generation_log').insert({
      user_id: user.id,
      prompt_template_id: prompt?.id || null,
      type: 'conversation',
      input_context: { conversation: conversation.slice(0, 500) },
      generated_content: result.content,
      model_used: result.model,
      tokens_used: result.tokensUsed,
    });

    return NextResponse.json({ response: result.content });
  } catch (err) {
    console.error('[ai/conversation] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
