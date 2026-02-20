import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch history, credits used this month, and bonus scripts in parallel
  const [{ data: scripts, error: scriptsError }, { count: monthCount, error: countError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from('personalized_scripts')
        .select('id, situation, details, generated_content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
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

  if (scriptsError || countError || profileError) {
    console.error('History fetch error:', { scriptsError, countError, profileError });
    return NextResponse.json(
      { error: 'Erro ao carregar histórico.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    scripts: scripts ?? [],
    creditsUsed: monthCount ?? 0,
    bonusScripts: profile?.bonus_scripts ?? 0,
  });
}
