import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run both RPCs in parallel: record active day + add cyclic XP for daily login
  const [activeDayRes, cyclicXpRes] = await Promise.all([
    supabase.rpc('record_active_day', { p_user_id: user.id }),
    supabase.rpc('add_cyclic_xp', { p_user_id: user.id, p_xp: 10 }),
  ]);

  if (activeDayRes.error) {
    return NextResponse.json(
      { error: activeDayRes.error.message },
      { status: 500 }
    );
  }

  if (cyclicXpRes.error) {
    console.error('Failed to add cyclic XP:', cyclicXpRes.error.message);
    // Don't fail the whole request – active day is the primary operation
  }

  const result = activeDayRes.data;

  return NextResponse.json({
    active_days: result?.active_days ?? 0,
    level: result?.level ?? 'iniciante',
    leveled_up: result?.leveled_up ?? false,
    bonus_scripts: result?.bonus_scripts ?? 0,
    streak: result?.streak ?? 0,
    streak_reward_pending: result?.streak_reward_pending ?? false,
    cyclic_xp_added: !cyclicXpRes.error,
  });
}
