import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe, PLAN_FROM_PRICE } from '@/lib/payments/stripe';

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

async function upgradePlan(userId: string, plan: string) {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  const credits = getAiCreditsForPlan(plan);

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      plan_started_at: now,
      ai_credits_remaining: credits.remaining,
      ai_credits_monthly: credits.monthly,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to upgrade plan: ${error.message}`);
  }
}

async function downgradeToStarter(userId: string) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'starter',
      plan_started_at: null,
      plan_expires_at: null,
      ai_credits_remaining: 0,
      ai_credits_monthly: 0,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to downgrade plan: ${error.message}`);
  }
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
      event_type: `stripe_${eventType}`,
      payload,
      status,
      user_id: userId || null,
      error_message: errorMessage || null,
    });
  } catch {
    console.error('[webhook/stripe] Failed to log event:', eventType);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[webhook/stripe] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // 2. Verify Stripe signature
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[webhook/stripe] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // 3. Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          await logWebhookEvent('checkout_completed', { session_id: session.id }, 'error', undefined, 'Missing user_id or plan in metadata');
          break;
        }

        // Save Stripe customer ID to profile
        if (session.customer) {
          const supabase = await createAdminClient();
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);
        }

        // Upgrade user plan
        await upgradePlan(userId, plan);
        await logWebhookEvent('checkout_completed', {
          session_id: session.id,
          plan,
          customer: session.customer,
        }, 'success', userId);

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const supabase = await createAdminClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent('subscription_updated', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, 'User not found for customer');
          break;
        }

        // Determine the new plan from the subscription's price
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = priceId ? PLAN_FROM_PRICE[priceId] : null;

        if (newPlan && subscription.status === 'active') {
          await upgradePlan(profile.id, newPlan);
          await logWebhookEvent('subscription_updated', {
            subscription_id: subscription.id,
            plan: newPlan,
            status: subscription.status,
          }, 'success', profile.id);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await downgradeToStarter(profile.id);
          await logWebhookEvent('subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
          }, 'success', profile.id);
        } else {
          await logWebhookEvent('subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
            price_id: priceId,
          }, 'info', profile.id);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const supabase = await createAdminClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent('subscription_deleted', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, 'User not found for customer');
          break;
        }

        // Downgrade to starter
        await downgradeToStarter(profile.id);
        await logWebhookEvent('subscription_deleted', {
          subscription_id: subscription.id,
          customer: customerId,
        }, 'success', profile.id);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        // Find user by stripe_customer_id
        const supabase = await createAdminClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        console.warn(
          '[webhook/stripe] Payment failed for customer:',
          customerId,
          'email:',
          profile?.email || 'unknown'
        );

        await logWebhookEvent('payment_failed', {
          invoice_id: invoice.id,
          customer: customerId,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
        }, 'warning', profile?.id);

        // TODO: Send email notification about failed payment
        break;
      }

      default: {
        // Log unhandled events for monitoring
        await logWebhookEvent(event.type, { event_id: event.id }, 'unhandled');
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook/stripe] Error:', error);

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
