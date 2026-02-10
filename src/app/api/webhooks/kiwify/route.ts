import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';

const SOURCE = 'kiwify';

const KIWIFY_PRODUCT_MAP: Record<string, string> = {
  [process.env.KIWIFY_PRODUCT_PRO || '']: 'pro',
  [process.env.KIWIFY_PRODUCT_PREMIUM || '']: 'premium',
  [process.env.KIWIFY_PRODUCT_COPILOT || '']: 'copilot',
};

/**
 * Kiwify Webhook
 *
 * Formato JSON esperado (padrão Kiwify):
 * {
 *   "order_id": "xxx",
 *   "order_status": "paid" | "refunded" | "chargedback" | "waiting_payment" | "expired",
 *   "product": {
 *     "product_id": "xxx",
 *     "product_name": "50 Scripts Plus"
 *   },
 *   "Customer": {
 *     "full_name": "João Silva",
 *     "email": "joao@email.com"
 *   },
 *   "Subscription": {
 *     "id": "xxx",
 *     "status": "active" | "canceled" | "past_due",
 *     "plan": { "id": "xxx", "name": "..." }
 *   },
 *   "webhook_event_type": "order_paid" | "order_refunded" | "subscription_canceled" | "chargeback"
 * }
 *
 * Autenticação: Header X-Kiwify-Token
 * Env vars: KIWIFY_TOKEN, KIWIFY_PRODUCT_PRO, KIWIFY_PRODUCT_PREMIUM, KIWIFY_PRODUCT_COPILOT
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify token
    if (!verifyToken(request.headers.get('X-Kiwify-Token'), process.env.KIWIFY_TOKEN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const event = body.webhook_event_type || body.order_status;
    const customerData = body.Customer || {};
    const productId = body.product?.product_id?.toString() || body.Subscription?.plan?.id?.toString() || '';
    const customerEmail = customerData.email || '';
    const customerName = customerData.full_name || '';

    if (!event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    // 3. Handle events
    switch (event) {
      case 'order_paid':
      case 'paid': {
        if (!customerEmail) {
          await logWebhookEvent(SOURCE, 'order_paid', body, 'error', undefined, 'Missing customer email');
          return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
        }

        const plan = KIWIFY_PRODUCT_MAP[productId] || 'pro';
        const result = await handlePurchase(customerEmail, customerName, plan, SOURCE, {
          product_id: productId,
          order_id: body.order_id,
        });

        return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
      }

      case 'order_refunded':
      case 'refunded':
      case 'chargeback':
      case 'chargedback':
      case 'subscription_canceled':
      case 'canceled': {
        if (!customerEmail) {
          await logWebhookEvent(SOURCE, event, body, 'error', undefined, 'Missing customer email');
          return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
        }

        try {
          const result = await handleCancellation(customerEmail, SOURCE, event, {
            product_id: productId,
            order_id: body.order_id,
          });
          return NextResponse.json({ success: true, user_id: result.userId });
        } catch (err) {
          if (err instanceof Error && err.message === 'User not found') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          throw err;
        }
      }

      case 'waiting_payment':
      case 'expired': {
        await logWebhookEvent(SOURCE, event, {
          email: customerEmail,
          product_id: productId,
          order_id: body.order_id,
        }, 'warning');

        return NextResponse.json({ received: true, event });
      }

      default: {
        await logWebhookEvent(SOURCE, event, body, 'unhandled');
        return NextResponse.json({ received: true, event });
      }
    }
  } catch (error) {
    console.error('[webhook/kiwify] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'processing_error', {}, 'error', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
