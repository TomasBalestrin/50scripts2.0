import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

const HOTMART_PRODUCT_MAP: Record<string, string> = {
  [process.env.HOTMART_PRODUCT_PRO || '']: 'pro',
  [process.env.HOTMART_PRODUCT_PREMIUM || '']: 'premium',
  [process.env.HOTMART_PRODUCT_COPILOT || '']: 'copilot',
};

function getAiCreditsForPlan(plan: string): { monthly: number; remaining: number } {
  switch (plan) {
    case 'pro':
      return { monthly: 0, remaining: 0 };
    case 'premium':
      return { monthly: 15, remaining: 15 };
    case 'copilot':
      return { monthly: -1, remaining: -1 }; // unlimited
    default:
      return { monthly: 0, remaining: 0 };
  }
}

function verifyHottok(request: NextRequest): boolean {
  const hottok = request.headers.get('X-Hotmart-Hottok');
  if (!hottok || !process.env.HOTMART_HOTTOK) return false;

  const expected = Buffer.from(process.env.HOTMART_HOTTOK, 'utf-8');
  const received = Buffer.from(hottok, 'utf-8');

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}

async function logWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  status: string,
  userId?: string,
  errorMessage?: string,
) {
  try {
    const supabase = await createAdminClient();
    await supabase.from('webhook_logs').insert({
      event_type: `hotmart_${eventType}`,
      payload,
      status,
      user_id: userId || null,
      error_message: errorMessage || null,
    });
  } catch {
    console.error('[webhook/hotmart] Failed to log event:', eventType);
  }
}

async function findOrCreateUser(
  email: string,
  name: string,
): Promise<string> {
  const supabase = await createAdminClient();

  // Try to find existing user by email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return existingProfile.id;
  }

  // Create new auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: process.env.DEFAULT_USER_PASSWORD || 'Script@123',
    email_confirm: true,
  });

  if (authError) {
    // Handle case where auth user exists but profile doesn't
    if (
      authError.message?.toLowerCase().includes('already') ||
      authError.message?.toLowerCase().includes('duplicate')
    ) {
      // Try to get user from auth
      const { data: users } = await supabase.auth.admin.listUsers();
      const authUser = users?.users?.find((u) => u.email === email);
      if (authUser) {
        return authUser.id;
      }
    }
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Generate unique referral code
  const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email,
    full_name: name || '',
    plan: 'starter',
    referral_code: referralCode,
    webhook_source: 'hotmart',
  });

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  return userId;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Hottok header
    if (!verifyHottok(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const event = body.event;
    const buyerData = body.data?.buyer || {};
    const productId = body.data?.product?.id?.toString() || body.data?.subscription?.product?.id?.toString() || '';
    const buyerEmail = buyerData.email || '';
    const buyerName = buyerData.name || '';

    if (!event) {
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 }
      );
    }

    // 3. Handle events
    switch (event) {
      case 'PURCHASE_COMPLETE': {
        if (!buyerEmail) {
          await logWebhookEvent('purchase_complete', body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json(
            { error: 'Missing buyer email' },
            { status: 400 }
          );
        }

        // Determine plan from product ID
        const plan = HOTMART_PRODUCT_MAP[productId] || 'pro';

        // Find or create user
        const userId = await findOrCreateUser(buyerEmail, buyerName);

        // Upgrade plan
        const supabase = await createAdminClient();
        const now = new Date().toISOString();
        const credits = getAiCreditsForPlan(plan);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            plan,
            plan_started_at: now,
            ai_credits_remaining: credits.remaining,
            ai_credits_monthly: credits.monthly,
            webhook_source: 'hotmart',
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Failed to upgrade plan: ${updateError.message}`);
        }

        await logWebhookEvent('purchase_complete', {
          email: buyerEmail,
          product_id: productId,
          plan,
        }, 'success', userId);

        return NextResponse.json(
          { success: true, user_id: userId, plan },
          { status: 200 }
        );
      }

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'SUBSCRIPTION_CANCELLATION': {
        if (!buyerEmail) {
          await logWebhookEvent(event.toLowerCase(), body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json(
            { error: 'Missing buyer email' },
            { status: 400 }
          );
        }

        const supabase = await createAdminClient();

        // Find user
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', buyerEmail)
          .single();

        if (!profile) {
          await logWebhookEvent(event.toLowerCase(), {
            email: buyerEmail,
          }, 'error', undefined, 'User not found');

          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Downgrade to starter
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
          throw new Error(`Failed to downgrade plan: ${updateError.message}`);
        }

        await logWebhookEvent(event.toLowerCase(), {
          email: buyerEmail,
          product_id: productId,
        }, 'success', profile.id);

        return NextResponse.json(
          { success: true, user_id: profile.id },
          { status: 200 }
        );
      }

      case 'PURCHASE_DELAYED':
      case 'PURCHASE_PROTEST': {
        console.warn(
          `[webhook/hotmart] ${event} for buyer:`,
          buyerEmail,
          'product:',
          productId
        );

        await logWebhookEvent(event.toLowerCase(), {
          email: buyerEmail,
          product_id: productId,
          buyer_name: buyerName,
        }, 'warning');

        return NextResponse.json(
          { received: true, event },
          { status: 200 }
        );
      }

      default: {
        await logWebhookEvent(event.toLowerCase(), body, 'unhandled');

        return NextResponse.json(
          { received: true, event },
          { status: 200 }
        );
      }
    }
  } catch (error) {
    console.error('[webhook/hotmart] Error:', error);

    try {
      await logWebhookEvent(
        'processing_error',
        {},
        'error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
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
