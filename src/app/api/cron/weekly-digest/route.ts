import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendWeeklyDigestEmail } from '@/lib/email/resend';

// Supabase admin client for cron (no cookies needed)
function createCronSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for cron context
        },
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron/weekly-digest] CRON_SECRET not configured');
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

    const supabase = createCronSupabaseClient();

    // 2. Fetch all active users with Pro+ plans
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, plan, current_streak, xp_points')
      .in('plan', ['pro', 'premium', 'copilot']);

    if (usersError) {
      console.error('[cron/weekly-digest] Error fetching users:', usersError.message);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No eligible users found' });
    }

    // 3. Calculate date range for the past week
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStart = oneWeekAgo.toISOString();

    let sentCount = 0;
    const errors: string[] = [];

    // 4. For each user, calculate weekly stats and send digest
    for (const user of users) {
      try {
        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) {
          console.warn(`[cron/weekly-digest] No email for user ${user.id}, skipping`);
          continue;
        }

        const email = authUser.user.email;
        const name = user.full_name || email.split('@')[0];

        // Fetch weekly script usage
        const { data: weeklyUsage } = await supabase
          .from('script_usage')
          .select('id, resulted_in_sale, sale_value')
          .eq('user_id', user.id)
          .gte('used_at', weekStart);

        const scriptsUsed = weeklyUsage?.length || 0;
        const sales = weeklyUsage?.filter((u) => u.resulted_in_sale).length || 0;
        const revenue = weeklyUsage
          ?.filter((u) => u.resulted_in_sale && u.sale_value)
          .reduce((acc, u) => acc + (u.sale_value || 0), 0) || 0;

        // Calculate XP earned this week from script usage and sales
        // Each script use = 10 XP, each sale = 25 XP (from XP_VALUES)
        const xpEarned = (scriptsUsed * 10) + (sales * 25);

        const stats = {
          scripts_used: scriptsUsed,
          sales,
          revenue,
          streak: user.current_streak || 0,
          xp_earned: xpEarned,
        };

        const result = await sendWeeklyDigestEmail(email, name, stats);

        if (result.success) {
          sentCount++;
        } else {
          errors.push(`${user.id}: ${result.error}`);
        }
      } catch (userError) {
        const message = userError instanceof Error ? userError.message : 'Unknown error';
        console.error(`[cron/weekly-digest] Error processing user ${user.id}:`, message);
        errors.push(`${user.id}: ${message}`);
      }
    }

    console.log(`[cron/weekly-digest] Sent ${sentCount}/${users.length} digest emails`);

    if (errors.length > 0) {
      console.warn('[cron/weekly-digest] Errors:', errors);
    }

    return NextResponse.json({
      sent: sentCount,
      total: users.length,
      errors: errors.length,
    });
  } catch (error) {
    console.error('[cron/weekly-digest] Fatal error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
