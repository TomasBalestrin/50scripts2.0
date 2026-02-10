import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check which env vars are configured (never expose actual values)
  const envStatus = {
    HOTMART_HOTTOK: !!process.env.HOTMART_HOTTOK,
    HOTMART_PRODUCT_PRO: !!process.env.HOTMART_PRODUCT_PRO,
    HOTMART_PRODUCT_PREMIUM: !!process.env.HOTMART_PRODUCT_PREMIUM,
    HOTMART_PRODUCT_COPILOT: !!process.env.HOTMART_PRODUCT_COPILOT,
    WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };

  // Build the base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;

  const webhookEndpoints = [
    {
      name: 'Hotmart',
      path: '/api/webhooks/hotmart',
      auth: 'X-Hotmart-Hottok',
      description: 'Recebe eventos de compra, cancelamento e reembolso da Hotmart',
      events: ['PURCHASE_COMPLETE', 'PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'SUBSCRIPTION_CANCELLATION'],
      configured: envStatus.HOTMART_HOTTOK,
    },
    {
      name: 'Liberação de Acesso',
      path: '/api/webhooks/access-grant',
      auth: 'X-Webhook-Secret',
      description: 'Cria usuário e libera acesso ao plano via API externa',
      events: ['access_grant'],
      configured: envStatus.WEBHOOK_SECRET,
    },
    {
      name: 'Upgrade de Plano',
      path: '/api/webhooks/plan-upgrade',
      auth: 'X-Webhook-Secret',
      description: 'Faz upgrade do plano de um usuário existente',
      events: ['plan_upgrade'],
      configured: envStatus.WEBHOOK_SECRET,
    },
    {
      name: 'Cancelamento de Plano',
      path: '/api/webhooks/plan-cancel',
      auth: 'X-Webhook-Secret',
      description: 'Cancela o plano e volta para Starter',
      events: ['plan_cancel'],
      configured: envStatus.WEBHOOK_SECRET,
    },
    {
      name: 'Stripe',
      path: '/api/webhooks/stripe',
      auth: 'stripe-signature',
      description: 'Recebe eventos de pagamento do Stripe',
      events: ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed'],
      configured: envStatus.STRIPE_WEBHOOK_SECRET,
    },
  ];

  return NextResponse.json({
    baseUrl,
    envStatus,
    webhookEndpoints,
    productMapping: {
      pro: { label: 'Plus (R$19,90)', envVar: 'HOTMART_PRODUCT_PRO', configured: envStatus.HOTMART_PRODUCT_PRO },
      premium: { label: 'Pro (R$39,90)', envVar: 'HOTMART_PRODUCT_PREMIUM', configured: envStatus.HOTMART_PRODUCT_PREMIUM },
      copilot: { label: 'Premium (R$99,90)', envVar: 'HOTMART_PRODUCT_COPILOT', configured: envStatus.HOTMART_PRODUCT_COPILOT },
    },
  });
}
