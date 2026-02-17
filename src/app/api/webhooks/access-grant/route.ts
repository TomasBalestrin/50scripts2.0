import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { webhookAccessGrantSchema } from '@/lib/validations/schemas';
import { getDefaultPassword } from '@/lib/auth-utils';
import { logWebhookEvent } from '@/lib/webhooks/shared';

function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || !process.env.WEBHOOK_SECRET) return false;

  const expected = Buffer.from(process.env.WEBHOOK_SECRET, 'utf-8');
  const received = Buffer.from(secret, 'utf-8');

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}

export async function POST(request: NextRequest) {
  let extractedEmail = '';

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
    extractedEmail = (body as Record<string, unknown>)?.email as string || '';
    const parsed = webhookAccessGrantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, source, referral_code } = parsed.data;
    extractedEmail = email;

    // 3. Create Supabase admin client
    const supabase = await createAdminClient();

    // 4. Create auth user with default password from app_config
    const defaultPassword = await getDefaultPassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
    });

    if (authError) {
      // Handle duplicate email
      if (authError.message?.toLowerCase().includes('already') ||
          authError.message?.toLowerCase().includes('duplicate')) {
        await logWebhookEvent(
          source || 'access-grant',
          'access_grant',
          { email, name, source, referral_code },
          'duplicate',
          email,
          undefined,
          authError.message,
        );

        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      throw authError;
    }

    const userId = authData.user.id;

    // 5. Resolve referrer if referral_code is provided
    let referredBy: string | null = null;

    if (referral_code) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referral_code)
        .single();

      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // 6. Generate unique referral code for new user
    const newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // 7. Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name: name || '',
      plan: 'starter',
      referral_code: newReferralCode,
      referred_by: referredBy,
    });

    if (profileError) {
      throw profileError;
    }

    // 8. Log to webhook_logs (upsert per email)
    await logWebhookEvent(
      source || 'access-grant',
      'access_grant',
      { email, name, source, referral_code },
      'success',
      email,
      userId,
      undefined,
      { userCreated: true },
    );

    return NextResponse.json(
      { success: true, user_id: userId },
      { status: 200 }
    );
  } catch (error) {
    console.error('[webhook/access-grant] Error:', error);

    try {
      await logWebhookEvent(
        'access-grant',
        'access_grant',
        {},
        'error',
        extractedEmail || undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
      );
    } catch {
      // Logging failed silently
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
