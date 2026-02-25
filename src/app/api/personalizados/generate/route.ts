import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatCompletion } from '@/lib/ai/openai';
import { BASE_MONTHLY_SCRIPTS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: { situation?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { situation, details } = body;
  if (!situation?.trim() || !details?.trim()) {
    return NextResponse.json(
      { error: 'Situação e detalhes são obrigatórios.' },
      { status: 400 }
    );
  }

  // Credit check: count this month's generations + get bonus scripts in parallel
  const [{ count: monthCount, error: countError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from('personalized_scripts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from('profiles')
        .select('bonus_scripts')
        .eq('id', user.id)
        .single(),
    ]);

  if (countError || profileError) {
    const errMsg = countError?.message || profileError?.message || 'Unknown';
    console.error('[personalizados/generate] Credit check error:', errMsg);
    return NextResponse.json(
      { error: `Erro ao verificar créditos: ${errMsg}` },
      { status: 500 }
    );
  }

  const usedThisMonth = monthCount ?? 0;
  const bonus = profile?.bonus_scripts ?? 0;
  const remaining = (BASE_MONTHLY_SCRIPTS + bonus) - usedThisMonth;

  if (remaining <= 0) {
    return NextResponse.json(
      { error: 'Você atingiu o limite de scripts deste mês. Continue usando a plataforma para ganhar bônus!' },
      { status: 429 }
    );
  }

  // Load onboarding data for personalization context
  const { data: onboarding } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Build system prompt with onboarding context
  const contextParts: string[] = [];
  if (onboarding) {
    if (onboarding.business_type) contextParts.push(`O vendedor trabalha com: ${onboarding.business_type}`);
    if (onboarding.company_name) contextParts.push(`Empresa: ${onboarding.company_name}`);
    if (onboarding.role_in_business) contextParts.push(`Função: ${onboarding.role_in_business}`);
    if (onboarding.faturamento_mensal) contextParts.push(`Faturamento mensal: ${onboarding.faturamento_mensal}`);
    if (onboarding.average_ticket) contextParts.push(`Ticket médio: ${onboarding.average_ticket}`);
    if (onboarding.target_audience) contextParts.push(`Público-alvo: ${onboarding.target_audience}`);
    if (onboarding.main_objections) contextParts.push(`Principais objeções: ${onboarding.main_objections}`);
    if (onboarding.main_challenges) contextParts.push(`Desafios: ${onboarding.main_challenges}`);
  }

  const sellerContext = contextParts.length > 0
    ? contextParts.join('\n')
    : 'Nenhuma informação de perfil disponível.';

  const systemPrompt = `Você é um especialista em scripts de vendas pelo WhatsApp.
${sellerContext}

Gere um script personalizado, natural e persuasivo para a situação descrita.
Use variáveis {{NOME_LEAD}} e {{MEU_NOME}} onde apropriado.
Máximo 300 palavras. Responda apenas com o script, sem explicações.`;

  const userPrompt = `Situacao: ${situation.trim()}\n\nDetalhes adicionais: ${details.trim()}`;

  // Call AI
  let aiResult: { content: string };
  try {
    aiResult = await chatCompletion(systemPrompt, userPrompt, {
      model: 'gpt-4o-mini',
      maxTokens: 1000,
    });
  } catch (err) {
    console.error('AI generation error:', err);
    return NextResponse.json(
      { error: 'Erro ao gerar script com IA. Tente novamente.' },
      { status: 500 }
    );
  }

  // Save to personalized_scripts table
  const { error: insertError } = await supabase
    .from('personalized_scripts')
    .insert({
      user_id: user.id,
      situation: situation.trim(),
      description: details.trim(),
      generated_content: aiResult.content,
    });

  if (insertError) {
    console.error('Insert error:', insertError);
    // Still return the content even if save fails
  }

  // Award +5 cyclic XP for generating personalized script
  let xpResult = null;
  try {
    const { data: xpData } = await supabase.rpc('add_cyclic_xp', {
      p_user_id: user.id,
      p_xp: 5,
    });
    xpResult = xpData;
  } catch (err) {
    console.error('XP award error:', err);
  }

  const newRemaining = remaining - 1;

  return NextResponse.json({
    content: aiResult.content,
    remaining: newRemaining,
    xp: xpResult,
  });
}
