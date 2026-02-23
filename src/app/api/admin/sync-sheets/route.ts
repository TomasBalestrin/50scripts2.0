import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { clearAndWriteSheet } from '@/lib/google-sheets';

/**
 * POST /api/admin/sync-sheets
 * Full sync: reads all onboarding data from Supabase and writes to Google Sheets.
 * Clears the sheet first, then writes header + all rows.
 * Admin-only endpoint.
 */
export async function POST() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    // Fetch all onboarding data with profile info
    const { data: onboardings, error: dbError } = await supabase
      .from('user_onboarding')
      .select('*, profiles!user_onboarding_user_id_fkey(email, is_active)')
      .order('created_at', { ascending: true });

    if (dbError) {
      console.error('[sync-sheets] DB error:', dbError);
      return NextResponse.json(
        { error: `Erro ao buscar dados: ${dbError.message}` },
        { status: 500 }
      );
    }

    const rows: string[][] = [];

    // Header row
    rows.push([
      'Data Cadastro',
      'Nome',
      'Telefone',
      'Email',
      'Instagram',
      'Empresa',
      'Tipo de Negócio',
      'Tipo Customizado',
      'Cargo',
      'Faturamento Mensal',
      'Ticket Médio',
      'Público-Alvo',
      'Principais Objeções',
      'Desafios',
      'Desafios Customizados',
      'Tem Sócio',
      'Tempo conhece Cleiton',
      'Email da Conta',
      'Ativo',
    ]);

    // Data rows
    for (const o of onboardings ?? []) {
      const createdAt = o.created_at
        ? new Date(o.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : '';
      const challenges = Array.isArray(o.main_challenges)
        ? o.main_challenges.join(', ')
        : '';
      const profile = o.profiles as { email?: string; is_active?: boolean } | null;

      rows.push([
        createdAt,
        o.full_name || '',
        o.phone || '',
        o.email || '',
        o.instagram || '',
        o.company_name || '',
        o.business_type || '',
        o.business_type_custom || '',
        o.role_in_business || '',
        o.faturamento_mensal || '',
        o.average_ticket || '',
        o.target_audience || '',
        o.main_objections || '',
        challenges,
        o.main_challenges_custom || '',
        o.has_partner ? 'Sim' : 'Não',
        o.time_knowing_cleiton || '',
        profile?.email || '',
        profile?.is_active ? 'Sim' : 'Não',
      ]);
    }

    await clearAndWriteSheet(rows);

    return NextResponse.json({
      success: true,
      synced: (onboardings ?? []).length,
      message: `${(onboardings ?? []).length} registros sincronizados com Google Sheets`,
    });
  } catch (err) {
    console.error('[sync-sheets] Error:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao sincronizar: ${message}` },
      { status: 500 }
    );
  }
}
