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

  // First, record the active day (checks once-per-day guard)
  const activeDayRes = await supabase.rpc('record_active_day', {
    p_user_id: user.id,
  });

  if (activeDayRes.error) {
    return NextResponse.json(
      { error: activeDayRes.error.message },
      { status: 500 }
    );
  }

  const result = activeDayRes.data;

  // Only add cyclic XP if this is the first visit today (not already recorded)
  // This prevents duplicate XP on every page refresh
  let cyclicXpAdded = false;
  let cyclicXpRewardPending = false;

  if (!result?.already_recorded) {
    const cyclicXpRes = await supabase.rpc('add_cyclic_xp', {
      p_user_id: user.id,
      p_xp: 10,
    });

    if (cyclicXpRes.error) {
      console.error('Failed to add cyclic XP:', cyclicXpRes.error.message);
    } else {
      cyclicXpAdded = true;
      cyclicXpRewardPending = cyclicXpRes.data?.reward_pending ?? false;
    }
  }

  return NextResponse.json({
    active_days: result?.active_days ?? 0,
    level: result?.level ?? 'iniciante',
    leveled_up: result?.leveled_up ?? false,
    bonus_scripts: result?.bonus_scripts ?? 0,
    streak: result?.streak ?? 0,
    streak_reward_pending: result?.streak_reward_pending ?? false,
    cyclic_xp_added: cyclicXpAdded,
    cyclic_xp_reward_pending: cyclicXpRewardPending,
  });
}
