import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/daily-challenges
 *
 * Called by Vercel Cron. Generates daily challenges for all active Pro+ users
 * who don't already have a challenge for today.
 *
 * Requires CRON_SECRET header for authorization.
 *
 * Returns: { created: number, errors: number }
 */

const CHALLENGE_TYPES = [
  { type: 'use_scripts', targets: [3, 5, 7, 10], xpRange: [30, 50, 75, 100] },
  { type: 'rate_scripts', targets: [2, 3, 5], xpRange: [25, 35, 50] },
  { type: 'register_sale', targets: [1, 2], xpRange: [50, 75] },
] as const;

export async function GET(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron/daily-challenges] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Use admin client to bypass RLS
    const supabase = await createAdminClient();

    const today = new Date().toISOString().split('T')[0];

    // 3. Get all active Pro+ users who don't have a challenge today
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, plan')
      .eq('is_active', true)
      .in('plan', ['pro', 'premium', 'copilot']);

    if (usersError) {
      console.error('[cron/daily-challenges] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({ created: 0, errors: 0, message: 'No eligible users' });
    }

    // 4. Get users who already have challenges today
    const userIds = eligibleUsers.map((u) => u.id);
    const { data: existingChallenges, error: challengesError } = await supabase
      .from('daily_challenges')
      .select('user_id')
      .eq('challenge_date', today)
      .in('user_id', userIds);

    if (challengesError) {
      console.error('[cron/daily-challenges] Error fetching existing challenges:', challengesError);
      return NextResponse.json(
        { error: 'Failed to check existing challenges' },
        { status: 500 }
      );
    }

    const usersWithChallenges = new Set(
      (existingChallenges ?? []).map((c) => c.user_id)
    );

    // 5. Filter to users who need challenges
    const usersNeedingChallenges = eligibleUsers.filter(
      (u) => !usersWithChallenges.has(u.id)
    );

    if (usersNeedingChallenges.length === 0) {
      return NextResponse.json({
        created: 0,
        errors: 0,
        message: 'All eligible users already have challenges',
      });
    }

    // 6. Generate challenges for each user
    let created = 0;
    let errors = 0;

    // Batch insert for performance
    const challengesToInsert = usersNeedingChallenges.map((user) => {
      // Pick a random challenge type
      const challengeConfig =
        CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)];

      // Pick a random target from available targets
      const targetIdx = Math.floor(Math.random() * challengeConfig.targets.length);
      const target = challengeConfig.targets[targetIdx];

      // Pick corresponding XP reward (or random from range)
      const xpIdx = Math.min(targetIdx, challengeConfig.xpRange.length - 1);
      const xpReward = challengeConfig.xpRange[xpIdx];

      return {
        user_id: user.id,
        challenge_date: today,
        challenge_type: challengeConfig.type,
        target_count: target,
        xp_reward: xpReward,
        current_count: 0,
        completed: false,
      };
    });

    // Insert in batches of 100 to avoid hitting limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < challengesToInsert.length; i += BATCH_SIZE) {
      const batch = challengesToInsert.slice(i, i + BATCH_SIZE);

      const { data: inserted, error: insertError } = await supabase
        .from('daily_challenges')
        .insert(batch)
        .select('id');

      if (insertError) {
        console.error(
          `[cron/daily-challenges] Error inserting batch ${i / BATCH_SIZE + 1}:`,
          insertError
        );
        errors += batch.length;
      } else {
        created += inserted?.length ?? 0;
      }
    }

    console.log(
      `[cron/daily-challenges] Created ${created} challenges, ${errors} errors`
    );

    return NextResponse.json({
      created,
      errors,
      eligible_users: eligibleUsers.length,
      already_had_challenges: usersWithChallenges.size,
    });
  } catch (error) {
    console.error('[cron/daily-challenges] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
