import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPushBulk, type PushPayload } from '@/lib/notifications/send';

/**
 * POST /api/admin/push-notification
 *
 * Send a push notification to all subscribed users or a specific user.
 * Admin only.
 *
 * Body: { title, body, url?, tag?, userId? }
 * - If userId is provided, sends to that user only
 * - Otherwise sends to all users with push_subscription
 */
export async function POST(request: NextRequest) {
  // Verify admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, body, url, tag, userId } = await request.json();

  if (!title || !body) {
    return NextResponse.json(
      { error: 'title and body are required' },
      { status: 400 }
    );
  }

  const payload: PushPayload = { title, body, url, tag };
  const admin = await createAdminClient();

  // Fetch subscribers
  let query = admin
    .from('profiles')
    .select('id, push_subscription')
    .not('push_subscription', 'is', null);

  if (userId) {
    query = query.eq('id', userId);
  }

  const { data: subscribers, error } = await query;

  if (error) {
    console.error('[admin/push] Error fetching subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscribers found' });
  }

  const notifications = subscribers.map((s) => ({
    userId: s.id,
    subscription: s.push_subscription as Record<string, unknown>,
    payload,
  }));

  const result = await sendPushBulk(notifications);

  // Clean up expired subscriptions
  if (result.expired.length > 0) {
    for (const expiredId of result.expired) {
      await admin
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', expiredId);
    }
  }

  return NextResponse.json({
    sent: result.sent,
    failed: result.failed,
    expired_cleaned: result.expired.length,
    total_subscribers: subscribers.length,
  });
}
