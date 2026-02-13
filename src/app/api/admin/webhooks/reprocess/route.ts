import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { handlePurchase, handleCancellation, logWebhookEvent } from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

/**
 * POST /api/admin/webhooks/reprocess
 * Reprocesses a webhook log entry by ID.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing webhook log ID' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch the webhook log entry
    const { data: log, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !log) {
      return NextResponse.json({ error: 'Webhook log not found' }, { status: 404 });
    }

    const payload = log.payload as Record<string, unknown>;
    const source = log.source;
    const email = log.email_extracted;
    const eventType = log.event_type;

    if (!email) {
      return NextResponse.json({ error: 'No email in webhook log' }, { status: 400 });
    }

    // Extract buyer name from payload
    const buyerData = (payload.data as Record<string, unknown>)?.buyer as Record<string, unknown> | undefined;
    const buyerName = (buyerData?.name as string) || (buyerData?.full_name as string) || '';

    // Extract product ID from payload
    const productData = (payload.data as Record<string, unknown>)?.product as Record<string, unknown> | undefined;
    const subscriptionData = (payload.data as Record<string, unknown>)?.subscription as Record<string, unknown> | undefined;
    const subProduct = subscriptionData?.product as Record<string, unknown> | undefined;
    const productId = productData?.id?.toString() || subProduct?.id?.toString() ||
      (payload.product as Record<string, unknown>)?.product_id?.toString() || '';

    // Determine event type and process
    const normalizedEvent = eventType.toLowerCase();

    if (
      normalizedEvent.includes('approved') ||
      normalizedEvent.includes('complete') ||
      normalizedEvent.includes('paid') ||
      normalizedEvent === 'purchase' ||
      normalizedEvent === 'access_grant'
    ) {
      // Purchase event - create user and assign plan
      const config = await getPlatformConfig(source);
      const productMap = buildProductMap(config);
      const plan = productMap[productId] || 'starter';

      const result = await handlePurchase(email, buyerName, plan, source, {
        product_id: productId,
        reprocessed: true,
        original_log_id: id,
      });

      // Update original log entry
      await supabase
        .from('webhook_logs')
        .update({
          status: 'reprocessed',
          user_id: result.userId,
          user_created: true,
          plan_granted: result.plan,
          error_message: null,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        user_id: result.userId,
        plan: result.plan,
      });
    } else if (
      normalizedEvent.includes('refund') ||
      normalizedEvent.includes('chargeback') ||
      normalizedEvent.includes('cancel')
    ) {
      // Cancellation event
      try {
        const result = await handleCancellation(email, source, eventType, {
          reprocessed: true,
          original_log_id: id,
        });

        await supabase
          .from('webhook_logs')
          .update({
            status: 'reprocessed',
            user_id: result.userId,
            error_message: null,
          })
          .eq('id', id);

        return NextResponse.json({ success: true, user_id: result.userId });
      } catch (err) {
        if (err instanceof Error && err.message === 'User not found') {
          return NextResponse.json({ error: 'User not found for cancellation' }, { status: 404 });
        }
        throw err;
      }
    } else {
      return NextResponse.json(
        { error: `Unknown event type: ${eventType}. Cannot determine how to reprocess.` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[admin/webhooks/reprocess] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
