import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatCompletion } from '@/lib/ai/openai';
import { BASE_MONTHLY_SCRIPTS } from '@/lib/constants';

// Objective → category slug mapping for few-shot examples
const OBJECTIVE_CATEGORY_MAP: Record<string, string> = {
  'primeiro-contato': 'primeiro-contato',
  'follow-up': 'follow-up',
  'quebrar-objecao': 'quebra-objecoes',
  'pos-venda': 'pos-venda',
  'reativacao': 'ativacao-base',
  'cobrar-resposta': 'follow-up',
  'fechamento': 'fechamento',
  'aquecimento': 'ativacao-base',
};

// Tone instructions
const TONE_INSTRUCTIONS: Record<string, string> = {
  informal: 'Tom INFORMAL e amigavel: use linguagem leve, emojis com moderacao (1-2 por mensagem), fale como um amigo proximo. Nada de "prezado" ou "vossa senhoria".',
  formal: 'Tom FORMAL e profissional: use linguagem educada e cortês, sem emojis, sem girias. Mantenha respeito e profissionalismo, mas sem ser robotico.',
  direto: 'Tom DIRETO e objetivo: va direto ao ponto sem rodeios. Mensagem curta, clara, assertiva. Sem enrolacao, sem emojis excessivos. Mostre que valoriza o tempo do lead.',
};

// Objective descriptions for prompt context
const OBJECTIVE_DESCRIPTIONS: Record<string, string> = {
  'primeiro-contato': 'PRIMEIRO CONTATO: Primeira mensagem para um lead novo. Objetivo: despertar interesse, criar conexao inicial e abrir conversa.',
  'follow-up': 'FOLLOW-UP: Retorno apos contato anterior sem resposta. Objetivo: reengajar o lead sem parecer insistente ou desesperado.',
  'quebrar-objecao': 'QUEBRAR OBJECAO: O lead apresentou uma objecao (preco, tempo, duvida). Objetivo: contornar a objecao com empatia e argumento solido.',
  'pos-venda': 'POS-VENDA: Mensagem para cliente que ja comprou. Objetivo: fidelizar, pedir feedback, oferecer suporte ou gerar nova venda.',
  'reativacao': 'REATIVACAO: Lead ou cliente sumiu ha tempo. Objetivo: reconectar de forma natural, trazer novidade ou motivo para retomar conversa.',
  'cobrar-resposta': 'COBRAR RESPOSTA: Lead visualizou mas nao respondeu. Objetivo: conseguir uma resposta sem pressionar ou parecer desesperado.',
  'fechamento': 'FECHAMENTO: Lead esta quase decidido. Objetivo: dar o empurrao final para fechar a venda com urgencia genuina.',
  'aquecimento': 'AQUECIMENTO DE BASE: Lead frio que precisa ser nutrido. Objetivo: entregar valor (conteudo, dica, caso) sem vender diretamente.',
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: {
    situation?: string;
    details?: string;
    objective?: string;
    tone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { situation, details, objective, tone } = body;
  if (!situation?.trim()) {
    return NextResponse.json(
      { error: 'Descreva a situacao.' },
      { status: 400 }
    );
  }

  const selectedObjective = objective || 'primeiro-contato';
  const selectedTone = tone || 'informal';

  // Credit check + profile + onboarding + few-shot scripts in parallel
  const categorySlug = OBJECTIVE_CATEGORY_MAP[selectedObjective] || 'primeiro-contato';
  const toneField = selectedTone === 'formal' ? 'content_formal' : selectedTone === 'direto' ? 'content_direct' : 'content';

  const [
    { count: monthCount, error: countError },
    { data: profile, error: profileError },
    { data: onboarding },
    { data: exampleScripts },
  ] = await Promise.all([
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
    supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    // Fetch 2 example scripts from the matching category for few-shot
    supabase
      .from('scripts')
      .select(`title, ${toneField}, context_description, category_id`)
      .eq('is_active', true)
      .in('category_id', supabase.from('script_categories').select('id').eq('slug', categorySlug) as never)
      .limit(2),
  ]);

  if (countError || profileError) {
    const errMsg = countError?.message || profileError?.message || 'Unknown';
    console.error('[personalizados/generate] Credit check error:', errMsg);
    return NextResponse.json(
      { error: `Erro ao verificar creditos: ${errMsg}` },
      { status: 500 }
    );
  }

  const usedThisMonth = monthCount ?? 0;
  const bonus = profile?.bonus_scripts ?? 0;
  const remaining = (BASE_MONTHLY_SCRIPTS + bonus) - usedThisMonth;

  if (remaining <= 0) {
    return NextResponse.json(
      { error: 'Voce atingiu o limite de scripts deste mes. Continue usando a plataforma para ganhar bonus!' },
      { status: 429 }
    );
  }

  // If the subquery for scripts didn't work, try a direct approach
  let fewShotExamples: { title: string; content: string }[] = [];
  if (exampleScripts && exampleScripts.length > 0) {
    fewShotExamples = exampleScripts.map((s: Record<string, unknown>) => ({
      title: s.title as string,
      content: (s[toneField] as string) || (s.content as string) || '',
    }));
  } else {
    // Fallback: query with join
    const { data: fallbackScripts } = await supabase
      .from('scripts')
      .select(`title, ${toneField}, content, script_categories!inner(slug)`)
      .eq('is_active', true)
      .eq('script_categories.slug', categorySlug)
      .limit(2);

    if (fallbackScripts && fallbackScripts.length > 0) {
      fewShotExamples = fallbackScripts.map((s: Record<string, unknown>) => ({
        title: s.title as string,
        content: (s[toneField] as string) || (s.content as string) || '',
      }));
    }
  }

  // Build onboarding context
  const contextParts: string[] = [];
  if (onboarding) {
    if (onboarding.business_type) contextParts.push(`Segmento: ${onboarding.business_type}`);
    if (onboarding.company_name) contextParts.push(`Empresa: ${onboarding.company_name}`);
    if (onboarding.role_in_business) contextParts.push(`Funcao: ${onboarding.role_in_business}`);
    if (onboarding.faturamento_mensal) contextParts.push(`Faturamento mensal: ${onboarding.faturamento_mensal}`);
    if (onboarding.average_ticket) contextParts.push(`Ticket medio: ${onboarding.average_ticket}`);
    if (onboarding.target_audience) contextParts.push(`Publico-alvo: ${onboarding.target_audience}`);
    if (onboarding.main_objections) contextParts.push(`Principais objecoes dos leads: ${onboarding.main_objections}`);
    if (onboarding.main_challenges) contextParts.push(`Desafios do vendedor: ${onboarding.main_challenges}`);
  }

  const sellerContext = contextParts.length > 0
    ? `\n## PERFIL DO VENDEDOR\n${contextParts.join('\n')}`
    : '';

  // Build few-shot section
  const fewShotSection = fewShotExamples.length > 0
    ? `\n## EXEMPLOS DE REFERENCIA (use como base de qualidade e estilo, NAO copie)\n${fewShotExamples.map((ex, i) => `### Exemplo ${i + 1}: ${ex.title}\n${ex.content}`).join('\n\n')}`
    : '';

  // Build the system prompt
  const objectiveDesc = OBJECTIVE_DESCRIPTIONS[selectedObjective] || OBJECTIVE_DESCRIPTIONS['primeiro-contato'];
  const toneInstruction = TONE_INSTRUCTIONS[selectedTone] || TONE_INSTRUCTIONS['informal'];

  const systemPrompt = `Voce e um copywriter especialista em vendas pelo WhatsApp. Voce cria scripts que parecem mensagens reais de um vendedor, NAO textos de marketing.

## REGRAS OBRIGATORIAS
1. MAXIMO 150 palavras. Scripts de WhatsApp sao CURTOS. Ninguem le mensagem longa.
2. Paragrafos de 1-2 linhas no maximo. Quebre a mensagem em blocos curtos.
3. Use {{NOME_LEAD}} para o nome do lead e {{MEU_NOME}} para o nome do vendedor.
4. Use {{MINHA_EMPRESA}} para o nome da empresa quando apropriado.
5. Sempre termine com um CTA claro (pergunta ou proximo passo).
6. Pareca uma mensagem REAL de WhatsApp, nao um email ou propaganda.
7. Responda APENAS com o script pronto. Sem titulo, sem explicacao, sem "aqui esta".

## OBJETIVO
${objectiveDesc}

## TOM
${toneInstruction}
${sellerContext}
${fewShotSection}`;

  const userPrompt = details?.trim()
    ? `Situacao: ${situation.trim()}\n\nDetalhes adicionais: ${details.trim()}`
    : `Situacao: ${situation.trim()}`;

  // Call AI with gpt-4o
  let aiResult: { content: string };
  try {
    aiResult = await chatCompletion(systemPrompt, userPrompt, {
      model: 'gpt-4o',
      maxTokens: 600,
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
      description: details?.trim() || `[${selectedObjective}] [${selectedTone}]`,
      generated_content: aiResult.content,
    });

  if (insertError) {
    console.error('Insert error:', insertError);
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
