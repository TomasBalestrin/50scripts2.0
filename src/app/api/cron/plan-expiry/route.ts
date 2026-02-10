import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Cron job to downgrade users whose plan_expires_at has passed.
 * Should be called daily via Vercel Cron or external scheduler.
 *
 * Vercel cron config (vercel.json):
 * { "crons": [{ "path": "/api/cron/plan-expiry", "schedule": "0 3 * * *" }] }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    // Find all profiles with expired plans (not already starter)
    const { data: expiredProfiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, plan, plan_expires_at')
      .not('plan', 'eq', 'starter')
      .not('plan_expires_at', 'is', null)
      .lt('plan_expires_at', now);

    if (queryError) {
      console.error('[cron/plan-expiry] Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return NextResponse.json({ message: 'No expired plans found', count: 0 });
    }

    // Downgrade each expired user to starter
    const expiredIds = expiredProfiles.map((p) => p.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'starter',
        plan_started_at: null,
        plan_expires_at: null,
        ai_credits_remaining: 0,
        ai_credits_monthly: 0,
      })
      .in('id', expiredIds);

    if (updateError) {
      console.error('[cron/plan-expiry] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the expiry events
    const logEntries = expiredProfiles.map((p) => ({
      event_type: 'plan_expired',
      payload: { plan: p.plan, expires_at: p.plan_expires_at },
      status: 'success',
      user_id: p.id,
    }));

    await supabase.from('webhook_logs').insert(logEntries);

    console.log(`[cron/plan-expiry] Expired ${expiredIds.length} plans:`, expiredProfiles.map((p) => p.email));

    return NextResponse.json({
      message: `Expired ${expiredIds.length} plans`,
      count: expiredIds.length,
    });
  } catch (error) {
    console.error('[cron/plan-expiry] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
