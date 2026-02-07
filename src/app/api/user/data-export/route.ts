import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSecurityHeaders } from '@/lib/security/headers';
import { getDownloadHeaders } from '@/lib/security/headers';

/**
 * GET /api/user/data-export
 *
 * LGPD Compliance: Export all user data as downloadable JSON.
 * Exports: profile, script_usage, leads, badges, collections, referrals, ai_generation_log
 *
 * Requires authentication.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    const userId = user.id;

    // Fetch all user data in parallel
    const [
      profileResult,
      scriptUsageResult,
      leadsResult,
      badgesResult,
      collectionsResult,
      collectionScriptsResult,
      referralsResult,
      aiGenerationLogResult,
      dailyChallengesResult,
      agendaResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      supabase
        .from('script_usage')
        .select('*')
        .eq('user_id', userId)
        .order('used_at', { ascending: false }),
      supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
      supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('collection_scripts')
        .select('*, user_collections!inner(user_id)')
        .eq('user_collections.user_id', userId),
      supabase
        .from('referrals')
        .select('*')
        .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_generation_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('challenge_date', { ascending: false }),
      supabase
        .from('sales_agenda')
        .select('*')
        .eq('user_id', userId)
        .order('agenda_date', { ascending: false }),
    ]);

    // Compile the export data
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        user_email: user.email,
        format_version: '1.0',
        description: 'Exportação completa de dados do usuário - LGPD Art. 18',
      },
      profile: profileResult.data || null,
      script_usage: scriptUsageResult.data || [],
      leads: leadsResult.data || [],
      badges: badgesResult.data || [],
      collections: collectionsResult.data || [],
      collection_scripts: collectionScriptsResult.data || [],
      referrals: referralsResult.data || [],
      ai_generation_log: aiGenerationLogResult.data || [],
      daily_challenges: dailyChallengesResult.data || [],
      sales_agenda: agendaResult.data || [],
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `50scripts-dados-${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...getSecurityHeaders(),
        ...getDownloadHeaders(filename, 'application/json; charset=utf-8'),
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Erro ao exportar dados. Tente novamente.' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
