import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';

const SOURCE = 'pagtrust';

const PAGTRUST_PRODUCT_MAP: Record<string, string> = {
  [process.env.PAGTRUST_PRODUCT_PRO || '']: 'pro',
  [process.env.PAGTRUST_PRODUCT_PREMIUM || '']: 'premium',
  [process.env.PAGTRUST_PRODUCT_COPILOT || '']: 'copilot',
};

/**
 * PagTrust Webhook
 *
 * Formato JSON esperado (similar ao padrão Hotmart):
 * {
 *   "event": "PAYMENT_APPROVED" | "PAYMENT_REFUNDED" | "PAYMENT_CHARGEBACK" | "SUBSCRIPTION_CANCELED" | "PAYMENT_EXPIRED",
 *   "data": {
 *     "buyer": {
 *       "email": "joao@email.com",
 *       "name": "João Silva"
 *     },
 *     "product": {
 *       "id": "xxx",
 *       "name": "50 Scripts Plus"
 *     },
 *     "transaction": {
 *       "id": "xxx",
 *       "status": "approved" | "refunded" | "chargeback"
 *     },
 *     "subscription": {
 *       "id": "xxx",
 *       "status": "active" | "canceled",
 *       "product": { "id": "xxx" }
 *     }
 *   }
 * }
 *
 * Autenticação: Header X-PagTrust-Token
 * Env vars: PAGTRUST_TOKEN, PAGTRUST_PRODUCT_PRO, PAGTRUST_PRODUCT_PREMIUM, PAGTRUST_PRODUCT_COPILOT
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify token
    if (!verifyToken(request.headers.get('X-PagTrust-Token'), process.env.PAGTRUST_TOKEN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body (formato similar ao Hotmart)
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

    // 3. Handle events
    switch (event) {
      case 'PAYMENT_APPROVED': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, 'payment_approved', body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        const plan = PAGTRUST_PRODUCT_MAP[productId] || 'pro';
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
          await logWebhookEvent(SOURCE, event.toLowerCase(), body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        try {
          const result = await handleCancellation(buyerEmail, SOURCE, event.toLowerCase(), {
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
          email: buyerEmail,
          product_id: productId,
          transaction_id: transactionId,
        }, 'warning');

        return NextResponse.json({ received: true, event });
      }

      default: {
        await logWebhookEvent(SOURCE, event.toLowerCase(), body, 'unhandled');
        return NextResponse.json({ received: true, event });
      }
    }
  } catch (error) {
    console.error('[webhook/pagtrust] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'processing_error', {}, 'error', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
