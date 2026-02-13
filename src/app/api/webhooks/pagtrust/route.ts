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
 * Formato JSON esperado:
 * {
 *   "event": "purchase_approved" | "purchase_refunded" | "purchase_chargeback" | "subscription_canceled",
 *   "data": {
 *     "buyer": { "email": "...", "name": "..." },
 *     "product": { "id": "xxx", "name": "..." },
 *     "transaction": { "id": "xxx", "status": "approved" | "refunded" },
 *     "subscription": { "id": "xxx", "product": { "id": "xxx" } }
 *   }
 * }
 *
 * Também aceita eventos no formato PAYMENT_APPROVED (legado).
 * Autenticação: Header X-PagTrust-Token
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getPlatformConfig(SOURCE);

    if (!verifyToken(request.headers.get('X-PagTrust-Token'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawEvent = body.event;
    const buyerData = body.data?.buyer || {};
    const productId = body.data?.product?.id?.toString() || body.data?.subscription?.product?.id?.toString() || '';
    const transactionId = body.data?.transaction?.id || '';
    const buyerEmail = buyerData.email || '';
    const buyerName = buyerData.name || '';

    if (!rawEvent) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    // Normalize event to lowercase to handle both formats:
    // PagTrust sends: purchase_approved, purchase_refunded, etc.
    // Legacy format:  PAYMENT_APPROVED, PAYMENT_REFUNDED, etc.
    const event = rawEvent.toLowerCase();

    const productMap = buildProductMap(config);

    switch (event) {
      case 'purchase_approved':
      case 'payment_approved': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, 'purchase', body, 'error', '', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        const plan = productMap[productId] || 'starter';
        const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
          product_id: productId,
          transaction_id: transactionId,
        });

        return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
      }

      case 'purchase_refunded':
      case 'payment_refunded':
      case 'purchase_chargeback':
      case 'payment_chargeback':
      case 'subscription_canceled': {
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

      case 'payment_expired':
      case 'purchase_expired':
      case 'payment_pending':
      case 'purchase_pending': {
        await logWebhookEvent(SOURCE, event, {
          product_id: productId,
          transaction_id: transactionId,
        }, 'warning', buyerEmail);

        return NextResponse.json({ received: true, event: rawEvent });
      }

      default: {
        await logWebhookEvent(SOURCE, event, body, 'ignored', buyerEmail);
        return NextResponse.json({ received: true, event: rawEvent });
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
