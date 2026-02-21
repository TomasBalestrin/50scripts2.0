import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendToSheet } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      full_name,
      phone,
      email,
      instagram,
      company_name,
      business_type,
      business_type_custom,
      role_in_business,
      faturamento_mensal,
      average_ticket,
      target_audience,
      main_objections,
      main_challenges,
      main_challenges_custom,
      has_partner,
      time_knowing_cleiton,
    } = body;

    if (!full_name || !business_type) {
      return NextResponse.json(
        { error: 'Nome e tipo de negócio são obrigatórios' },
        { status: 400 }
      );
    }

    // Upsert user_onboarding data
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert(
        {
          user_id: user.id,
          full_name,
          phone: phone || null,
          email: email || null,
          instagram: instagram || null,
          company_name: company_name || null,
          business_type,
          business_type_custom: business_type_custom || null,
          role_in_business: role_in_business || null,
          faturamento_mensal: faturamento_mensal || null,
          average_ticket: average_ticket || null,
          target_audience: target_audience || null,
          main_objections: main_objections || null,
          main_challenges: main_challenges || [],
          main_challenges_custom: main_challenges_custom || null,
          has_partner: has_partner ?? false,
          time_knowing_cleiton: time_knowing_cleiton || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (onboardingError) {
      console.error('Onboarding save error:', onboardingError);
      return NextResponse.json(
        { error: `Erro ao salvar dados do onboarding: ${onboardingError.message}` },
        { status: 500 }
      );
    }

    // Update profile: set full_name and mark onboarding as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Erro ao atualizar perfil' },
        { status: 500 }
      );
    }

    // Send to Google Sheets (fire-and-forget)
    const now = new Date();
    const timestamp = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const challengesStr = Array.isArray(main_challenges) ? main_challenges.join(', ') : '';

    appendToSheet([
      timestamp,
      full_name || '',
      phone || '',
      email || '',
      instagram || '',
      company_name || '',
      business_type || '',
      business_type_custom || '',
      role_in_business || '',
      faturamento_mensal || '',
      average_ticket || '',
      target_audience || '',
      main_objections || '',
      challengesStr,
      main_challenges_custom || '',
      has_partner ? 'Sim' : 'Não',
      time_knowing_cleiton || '',
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding API error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
