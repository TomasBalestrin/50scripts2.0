import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPushBulk, type PushPayload } from '@/lib/notifications/send';

/**
 * GET /api/cron/push-notifications
 *
 * Vercel Cron job that runs daily at 10 AM UTC (7 AM BRT).
 * Checks conditions and sends relevant push notifications:
 *
 * 1. Streak at risk - user has streak > 0 but didn't use app yesterday
 * 2. Weekly report - every Monday
 * 3. Cyclic XP milestone - user's cyclic_xp >= 80 (close to 100 bonus)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();
    const now = new Date();
    const isMonday = now.getUTCDay() === 1;

    // Get all users with push subscriptions
    const { data: subscribers, error: subError } = await supabase
      .from('profiles')
      .select('id, full_name, push_subscription, current_streak, cyclic_xp, last_active_date, notification_prefs')
      .not('push_subscription', 'is', null)
      .eq('is_active', true);

    if (subError || !subscribers) {
      console.error('[cron/push] Error fetching subscribers:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    if (subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 });
    }

    const notifications: Array<{
      userId: string;
      subscription: Record<string, unknown>;
      payload: PushPayload;
    }> = [];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    for (const user of subscribers) {
      const prefs = (user.notification_prefs || {}) as Record<string, boolean>;
      const firstName = (user.full_name || '').split(' ')[0] || 'Ei';

      // 1. Streak at risk: has streak > 2, didn't use yesterday
      if (
        user.current_streak > 2 &&
        user.last_active_date !== yesterdayStr &&
        prefs.streak_at_risk !== false
      ) {
        notifications.push({
          userId: user.id,
          subscription: user.push_subscription as Record<string, unknown>,
          payload: {
            title: `${firstName}, seu streak de ${user.current_streak} dias esta em risco!`,
            body: 'Entre hoje e use um script para manter sua sequencia.',
            url: '/',
            tag: 'streak_at_risk',
          },
        });
        continue; // One notification per user per day
      }

      // 2. Cyclic XP close to bonus (>= 80)
      if (
        user.cyclic_xp >= 80 &&
        prefs.challenge_available !== false
      ) {
        const remaining = 100 - user.cyclic_xp;
        notifications.push({
          userId: user.id,
          subscription: user.push_subscription as Record<string, unknown>,
          payload: {
            title: `Faltam apenas ${remaining} XP para ganhar bonus!`,
            body: `${firstName}, voce esta quase la! Use mais scripts para desbloquear +5 personalizados.`,
            url: '/',
            tag: 'xp_milestone',
          },
        });
        continue;
      }

      // 3. Weekly report on Mondays
      if (isMonday && prefs.weekly_report !== false) {
        notifications.push({
          userId: user.id,
          subscription: user.push_subscription as Record<string, unknown>,
          payload: {
            title: 'Seu resumo semanal esta pronto!',
            body: `${firstName}, veja como foi sua semana no Script Go.`,
            url: '/',
            tag: 'weekly_report',
          },
        });
      }
    }

    if (notifications.length === 0) {
      return NextResponse.json({
        message: 'No notifications to send',
        subscribers: subscribers.length,
        sent: 0,
      });
    }

    const result = await sendPushBulk(notifications);

    // Clean expired subscriptions
    if (result.expired.length > 0) {
      for (const expiredId of result.expired) {
        await supabase
          .from('profiles')
          .update({ push_subscription: null })
          .eq('id', expiredId);
      }
      console.log(`[cron/push] Cleaned ${result.expired.length} expired subscriptions`);
    }

    console.log(
      `[cron/push] Sent ${result.sent}/${notifications.length} notifications to ${subscribers.length} subscribers`
    );

    return NextResponse.json({
      sent: result.sent,
      failed: result.failed,
      expired_cleaned: result.expired.length,
      total_subscribers: subscribers.length,
      notifications_queued: notifications.length,
    });
  } catch (error) {
    console.error('[cron/push] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
