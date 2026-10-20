import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { clearAndWriteSheet } from '@/lib/google-sheets';
import { ONBOARDING_SHEET_HEADER, toOnboardingSheetCells } from '@/lib/onboarding/sheet';

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

    // Fetch onboarding data and profiles separately (no FK relationship in schema)
    const [onboardingRes, profilesRes] = await Promise.all([
      supabase
        .from('user_onboarding')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, email, is_active'),
    ]);

    if (onboardingRes.error) {
      console.error('[sync-sheets] DB error:', onboardingRes.error);
      return NextResponse.json(
        { error: `Erro ao buscar dados: ${onboardingRes.error.message}` },
        { status: 500 }
      );
    }

    const onboardings = onboardingRes.data ?? [];
    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p])
    );

    const rows: string[][] = [];

    rows.push(['Data Cadastro', ...ONBOARDING_SHEET_HEADER, 'Email da Conta', 'Ativo']);

    for (const o of onboardings) {
      const createdAt = o.created_at
        ? new Date(o.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : '';
      const profile = profileMap.get(o.user_id);

      rows.push([
        createdAt,
        ...toOnboardingSheetCells(o),
        profile?.email || '',
        profile?.is_active ? 'Sim' : 'Não',
      ]);
    }

    await clearAndWriteSheet(rows);

    return NextResponse.json({
      success: true,
      synced: onboardings.length,
      message: `${onboardings.length} registros sincronizados com Google Sheets`,
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
