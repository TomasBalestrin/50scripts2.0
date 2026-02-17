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
    const eventType = log.event_type;

    // Extract buyer data from multiple possible payload formats
    const data = payload.data as Record<string, unknown> | undefined;
    const buyerData = (data?.buyer as Record<string, unknown>) || (payload.Customer as Record<string, unknown>) || {};
    const buyerName = (buyerData?.name as string) || (buyerData?.full_name as string) || '';

    // Extract email: prefer email_extracted, fall back to payload
    const email = log.email_extracted
      || (buyerData?.email as string)
      || (payload.email as string)
      || '';

    if (!email) {
      return NextResponse.json({ error: 'No email in webhook log' }, { status: 400 });
    }

    // Extract product ID from multiple possible payload formats
    const productData = (data?.product as Record<string, unknown>) || {};
    const subscriptionData = (data?.subscription as Record<string, unknown>) || {};
    const subProduct = (subscriptionData?.product as Record<string, unknown>) || {};
    const kiwifyProduct = (payload.product as Record<string, unknown>) || {};
    const productId = productData?.id?.toString()
      || subProduct?.id?.toString()
      || kiwifyProduct?.product_id?.toString()
      || (payload.product_id as string)
      || '';

    // Determine event type and process
    // Strip platform prefix from event type (e.g. "hotmart_purchase_approved" -> "purchase_approved")
    const strippedEvent = eventType.replace(/^(hotmart|pagtrust|kiwify)_/i, '');
    const normalizedEvent = strippedEvent.toLowerCase();

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
        original_event: eventType,
      });

      // Update original log entry status to reprocessed
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
      const result = await handleCancellation(email, source, eventType, {
        reprocessed: true,
        original_log_id: id,
      });

      await supabase
        .from('webhook_logs')
        .update({
          status: 'reprocessed',
          user_id: result.userId || null,
          error_message: null,
        })
        .eq('id', id);

      return NextResponse.json({ success: true, user_id: result.userId || null });
    } else {
      // Treat any unknown event as a purchase (most common webhook type)
      const config = await getPlatformConfig(source);
      const productMap = buildProductMap(config);
      const plan = productMap[productId] || 'starter';

      const result = await handlePurchase(email, buyerName, plan, source, {
        product_id: productId,
        reprocessed: true,
        original_log_id: id,
        original_event: eventType,
      });

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
    }
  } catch (error) {
    console.error('[admin/webhooks/reprocess] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
