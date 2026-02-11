import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

const SOURCE = 'kiwify';

/**
 * Kiwify Webhook
 *
 * Formato JSON esperado (padrão Kiwify):
 * {
 *   "webhook_event_type": "order_paid" | "order_refunded" | "subscription_canceled" | "chargeback",
 *   "order_id": "xxx",
 *   "order_status": "paid" | "refunded" | "chargedback",
 *   "product": { "product_id": "xxx", "product_name": "..." },
 *   "Customer": { "full_name": "...", "email": "..." },
 *   "Subscription": { "id": "xxx", "status": "active" | "canceled", "plan": { "id": "xxx" } }
 * }
 *
 * Autenticação: Header X-Kiwify-Token
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getPlatformConfig(SOURCE);

    if (!verifyToken(request.headers.get('X-Kiwify-Token'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const event = body.webhook_event_type || body.order_status;
    const customerData = body.Customer || {};
    const productId = body.product?.product_id?.toString() || body.Subscription?.plan?.id?.toString() || '';
    const customerEmail = customerData.email || '';
    const customerName = customerData.full_name || '';

    if (!event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const productMap = buildProductMap(config);

    switch (event) {
      case 'order_paid':
      case 'paid': {
        if (!customerEmail) {
          await logWebhookEvent(SOURCE, 'purchase', body, 'error', '', undefined, 'Missing customer email');
          return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
        }

        const plan = productMap[productId] || 'starter';
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
          await logWebhookEvent(SOURCE, 'cancel', body, 'error', '', undefined, 'Missing customer email');
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
          product_id: productId,
          order_id: body.order_id,
        }, 'warning', customerEmail);

        return NextResponse.json({ received: true, event });
      }

      default: {
        await logWebhookEvent(SOURCE, event, body, 'ignored', customerEmail);
        return NextResponse.json({ received: true, event });
      }
    }
  } catch (error) {
    console.error('[webhook/kiwify] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'purchase', {}, 'error', '', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
