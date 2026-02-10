import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { webhookPlanUpgradeSchema } from '@/lib/validations/schemas';

function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || !process.env.WEBHOOK_SECRET) return false;

  const expected = Buffer.from(process.env.WEBHOOK_SECRET, 'utf-8');
  const received = Buffer.from(secret, 'utf-8');

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}

function getAiCreditsForPlan(plan: string): { monthly: number; remaining: number } {
  switch (plan) {
    case 'premium':
      return { monthly: 15, remaining: 15 };
    case 'copilot':
      return { monthly: -1, remaining: -1 };
    default:
      return { monthly: 0, remaining: 0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate webhook secret
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = webhookPlanUpgradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, plan, source } = parsed.data;

    // 3. Create Supabase admin client
    const supabase = await createAdminClient();

    // 4. Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      await supabase.from('webhook_logs').insert({
        source: source || 'plan-upgrade',
        event_type: 'upgrade',
        payload: { email, plan, source },
        email_extracted: email,
        status: 'error',
        error_message: 'User not found',
      });

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Calculate plan dates and AI credits
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const credits = getAiCreditsForPlan(plan);

    // 6. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan,
        plan_started_at: now,
        plan_expires_at: expiresAt,
        ai_credits_remaining: credits.remaining,
        ai_credits_monthly: credits.monthly,
      })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    // 7. Log to webhook_logs
    await supabase.from('webhook_logs').insert({
      source: source || 'plan-upgrade',
      event_type: 'upgrade',
      payload: { email, plan, source },
      email_extracted: email,
      plan_granted: plan,
      status: 'success',
      user_id: profile.id,
    });

    return NextResponse.json(
      { success: true, user_id: profile.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('[webhook/plan-upgrade] Error:', error);

    try {
      const supabase = await createAdminClient();
      await supabase.from('webhook_logs').insert({
        source: 'plan-upgrade',
        event_type: 'upgrade',
        payload: {},
        email_extracted: '',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch {
      // Logging failed silently
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
