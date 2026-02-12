import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cachedJson } from '@/lib/api-cache';

const CHALLENGE_TYPES = [
  { type: 'use_scripts', target: 5, label: 'Use 5 scripts hoje', xp: 50 },
  { type: 'use_scripts', target: 3, label: 'Use 3 scripts de Abordagem', xp: 30 },
  { type: 'rate_scripts', target: 3, label: 'Avalie 3 scripts', xp: 25 },
  { type: 'use_scripts', target: 7, label: 'Use 7 scripts diferentes', xp: 75 },
  { type: 'register_sale', target: 1, label: 'Registre uma venda', xp: 50 },
  { type: 'use_scripts', target: 10, label: 'Use 10 scripts hoje', xp: 100 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if challenge exists for today
  let { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('challenge_date', today)
    .single();

  // Create new challenge if none exists
  if (!challenge) {
    const random = CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)];
    const { data: newChallenge } = await supabase
      .from('daily_challenges')
      .insert({
        user_id: user.id,
        challenge_date: today,
        challenge_type: random.type,
        target_count: random.target,
        xp_reward: random.xp,
      })
      .select()
      .single();
    challenge = newChallenge;
  }

  // Get current progress based on type
  if (challenge && !challenge.completed) {
    let currentCount = 0;
    if (challenge.challenge_type === 'use_scripts') {
      const { count } = await supabase
        .from('script_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('used_at', `${today}T00:00:00`);
      currentCount = count || 0;
    } else if (challenge.challenge_type === 'rate_scripts') {
      const { count } = await supabase
        .from('script_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('effectiveness_rating', 'is', null)
        .gte('used_at', `${today}T00:00:00`);
      currentCount = count || 0;
    } else if (challenge.challenge_type === 'register_sale') {
      const { count } = await supabase
        .from('script_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('resulted_in_sale', true)
        .gte('used_at', `${today}T00:00:00`);
      currentCount = count || 0;
    }

    // Update progress
    const completed = currentCount >= challenge.target_count;
    await supabase
      .from('daily_challenges')
      .update({ current_count: currentCount, completed })
      .eq('id', challenge.id);

    // Grant XP on completion
    if (completed && !challenge.completed) {
      await supabase.rpc('add_xp', { p_user_id: user.id, p_xp: challenge.xp_reward });
    }

    challenge = { ...challenge, current_count: currentCount, completed };
  }

  return cachedJson({ challenge }, { maxAge: 60, staleWhileRevalidate: 120 });
}
