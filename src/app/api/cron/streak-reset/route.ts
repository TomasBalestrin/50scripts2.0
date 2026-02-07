import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/streak-reset
 *
 * Called by Vercel Cron. Resets streak_count to 0 for users who did not
 * use any script yesterday. Preserves longest_streak.
 *
 * Requires CRON_SECRET header for authorization.
 *
 * Returns: { reset: number }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron/streak-reset] CRON_SECRET not configured');
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

    // 3. Calculate yesterday's date range (in UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const yesterdayEnd = yesterday.toISOString().split('T')[0] + 'T23:59:59.999Z';

    // 4. Get all active users with a streak > 0
    const { data: usersWithStreak, error: usersError } = await supabase
      .from('profiles')
      .select('id, current_streak')
      .eq('is_active', true)
      .gt('current_streak', 0);

    if (usersError) {
      console.error('[cron/streak-reset] Error fetching users with streaks:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!usersWithStreak || usersWithStreak.length === 0) {
      return NextResponse.json({
        reset: 0,
        message: 'No users with active streaks',
      });
    }

    // 5. Check which users used a script yesterday
    const userIds = usersWithStreak.map((u) => u.id);

    // Get distinct user_ids who had script usage yesterday
    const { data: activeUsers, error: usageError } = await supabase
      .from('script_usage')
      .select('user_id')
      .in('user_id', userIds)
      .gte('used_at', yesterdayStart)
      .lte('used_at', yesterdayEnd);

    if (usageError) {
      console.error('[cron/streak-reset] Error checking script usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to check script usage' },
        { status: 500 }
      );
    }

    // Get unique active user IDs
    const activeUserIds = new Set(
      (activeUsers ?? []).map((u) => u.user_id)
    );

    // 6. Determine which users should have their streak reset
    const usersToReset = usersWithStreak.filter(
      (u) => !activeUserIds.has(u.id)
    );

    if (usersToReset.length === 0) {
      return NextResponse.json({
        reset: 0,
        checked: usersWithStreak.length,
        active_yesterday: activeUserIds.size,
        message: 'All users with streaks were active yesterday',
      });
    }

    // 7. Reset streaks in batches
    let resetCount = 0;
    const BATCH_SIZE = 100;
    const userIdsToReset = usersToReset.map((u) => u.id);

    for (let i = 0; i < userIdsToReset.length; i += BATCH_SIZE) {
      const batch = userIdsToReset.slice(i, i + BATCH_SIZE);

      const { error: updateError, count } = await supabase
        .from('profiles')
        .update({
          current_streak: 0,
          updated_at: new Date().toISOString(),
        })
        .in('id', batch)
        .gt('current_streak', 0);

      if (updateError) {
        console.error(
          `[cron/streak-reset] Error resetting batch ${i / BATCH_SIZE + 1}:`,
          updateError
        );
      } else {
        resetCount += count ?? batch.length;
      }
    }

    console.log(
      `[cron/streak-reset] Reset ${resetCount} streaks out of ${usersWithStreak.length} users checked`
    );

    return NextResponse.json({
      reset: resetCount,
      checked: usersWithStreak.length,
      active_yesterday: activeUserIds.size,
      skipped: activeUserIds.size,
    });
  } catch (error) {
    console.error('[cron/streak-reset] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
