import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

const SOURCE = 'pagtrust';

/**
 * PagTrust Webhook
 *
 * Formato JSON esperado (similar ao padrão Hotmart):
 * {
 *   "event": "PAYMENT_APPROVED" | "PAYMENT_REFUNDED" | "PAYMENT_CHARGEBACK" | "SUBSCRIPTION_CANCELED",
 *   "data": {
 *     "buyer": { "email": "...", "name": "..." },
 *     "product": { "id": "xxx", "name": "..." },
 *     "transaction": { "id": "xxx", "status": "approved" | "refunded" },
 *     "subscription": { "id": "xxx", "product": { "id": "xxx" } }
 *   }
 * }
 *
 * Autenticação: Header X-PagTrust-Token
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getPlatformConfig(SOURCE);

    if (!verifyToken(request.headers.get('X-PagTrust-Token'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const event = body.event;
    const buyerData = body.data?.buyer || {};
    const productId = body.data?.product?.id?.toString() || body.data?.subscription?.product?.id?.toString() || '';
    const transactionId = body.data?.transaction?.id || '';
    const buyerEmail = buyerData.email || '';
    const buyerName = buyerData.name || '';

    if (!event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const productMap = buildProductMap(config);

    switch (event) {
      case 'PAYMENT_APPROVED': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, 'purchase', body, 'error', '', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        const plan = productMap[productId] || 'pro';
        const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
          product_id: productId,
          transaction_id: transactionId,
        });

        return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
      }

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK':
      case 'SUBSCRIPTION_CANCELED': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, 'cancel', body, 'error', '', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        try {
          const result = await handleCancellation(buyerEmail, SOURCE, event, {
            product_id: productId,
            transaction_id: transactionId,
          });
          return NextResponse.json({ success: true, user_id: result.userId });
        } catch (err) {
          if (err instanceof Error && err.message === 'User not found') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          throw err;
        }
      }

      case 'PAYMENT_EXPIRED':
      case 'PAYMENT_PENDING': {
        await logWebhookEvent(SOURCE, event.toLowerCase(), {
          product_id: productId,
          transaction_id: transactionId,
        }, 'warning', buyerEmail);

        return NextResponse.json({ received: true, event });
      }

      default: {
        await logWebhookEvent(SOURCE, event.toLowerCase(), body, 'ignored', buyerEmail);
        return NextResponse.json({ received: true, event });
      }
    }
  } catch (error) {
    console.error('[webhook/pagtrust] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'purchase', {}, 'error', '', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
