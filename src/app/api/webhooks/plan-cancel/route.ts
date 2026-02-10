import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const webhookPlanCancelSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || !process.env.WEBHOOK_SECRET) return false;

  const expected = Buffer.from(process.env.WEBHOOK_SECRET, 'utf-8');
  const received = Buffer.from(secret, 'utf-8');

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
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
    const parsed = webhookPlanCancelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

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
        source: source || 'plan-cancel',
        event_type: 'cancel',
        payload: { email, source },
        email_extracted: email,
        status: 'error',
        error_message: 'User not found',
      });

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Downgrade to starter and clear plan data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'starter',
        plan_started_at: null,
        plan_expires_at: null,
        ai_credits_remaining: 0,
        ai_credits_monthly: 0,
      })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    // 6. Log to webhook_logs
    await supabase.from('webhook_logs').insert({
      source: source || 'plan-cancel',
      event_type: 'cancel',
      payload: { email, source },
      email_extracted: email,
      status: 'success',
      user_id: profile.id,
    });

    return NextResponse.json(
      { success: true, user_id: profile.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('[webhook/plan-cancel] Error:', error);

    try {
      const supabase = await createAdminClient();
      await supabase.from('webhook_logs').insert({
        source: 'plan-cancel',
        event_type: 'cancel',
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
