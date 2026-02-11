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

  // Build the base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;

  // Platform configurations
  const platforms = [
    {
      id: 'hotmart',
      name: 'Hotmart',
      path: '/api/webhooks/hotmart',
      auth: { header: 'X-Hotmart-Hottok', envVar: 'HOTMART_HOTTOK', configured: !!process.env.HOTMART_HOTTOK },
      events: ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'SUBSCRIPTION_CANCELLATION'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da Hotmart',
      products: {
        starter: { label: '50 Scripts (Acesso Base)', envVar: 'HOTMART_PRODUCT_STARTER', configured: !!process.env.HOTMART_PRODUCT_STARTER },
        pro: { label: 'Plus (R$19,90)', envVar: 'HOTMART_PRODUCT_PRO', configured: !!process.env.HOTMART_PRODUCT_PRO },
        premium: { label: 'Pro (R$39,90)', envVar: 'HOTMART_PRODUCT_PREMIUM', configured: !!process.env.HOTMART_PRODUCT_PREMIUM },
        copilot: { label: 'Premium (R$99,90)', envVar: 'HOTMART_PRODUCT_COPILOT', configured: !!process.env.HOTMART_PRODUCT_COPILOT },
      },
      setupSteps: [
        'Acesse o painel da Hotmart e vá em Ferramentas > Webhooks (API de Notificações)',
        'Clique em Configurações e adicione a URL do webhook acima',
        'No campo Hottok, defina um token seguro (o mesmo que você configurou na env var HOTMART_HOTTOK no Vercel)',
        'Selecione os eventos: PURCHASE_COMPLETE, PURCHASE_CANCELED, PURCHASE_REFUNDED, SUBSCRIPTION_CANCELLATION',
        'Configure as env vars HOTMART_PRODUCT_STARTER (produto base), HOTMART_PRODUCT_PRO, HOTMART_PRODUCT_PREMIUM e HOTMART_PRODUCT_COPILOT com os IDs dos produtos',
        'Faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
      ],
    },
    {
      id: 'kiwify',
      name: 'Kiwify',
      path: '/api/webhooks/kiwify',
      auth: { header: 'X-Kiwify-Token', envVar: 'KIWIFY_TOKEN', configured: !!process.env.KIWIFY_TOKEN },
      events: ['order_paid', 'order_refunded', 'subscription_canceled', 'chargeback'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da Kiwify',
      products: {
        starter: { label: '50 Scripts (Acesso Base)', envVar: 'KIWIFY_PRODUCT_STARTER', configured: !!process.env.KIWIFY_PRODUCT_STARTER },
        pro: { label: 'Plus (R$19,90)', envVar: 'KIWIFY_PRODUCT_PRO', configured: !!process.env.KIWIFY_PRODUCT_PRO },
        premium: { label: 'Pro (R$39,90)', envVar: 'KIWIFY_PRODUCT_PREMIUM', configured: !!process.env.KIWIFY_PRODUCT_PREMIUM },
        copilot: { label: 'Premium (R$99,90)', envVar: 'KIWIFY_PRODUCT_COPILOT', configured: !!process.env.KIWIFY_PRODUCT_COPILOT },
      },
      setupSteps: [
        'Acesse o painel da Kiwify e vá em Configurações > Webhooks',
        'Adicione a URL do webhook acima',
        'Gere um token de segurança e configure na env var KIWIFY_TOKEN no Vercel',
        'Selecione os eventos: order_paid, order_refunded, subscription_canceled, chargeback',
        'Configure as env vars KIWIFY_PRODUCT_STARTER (produto base), KIWIFY_PRODUCT_PRO, KIWIFY_PRODUCT_PREMIUM e KIWIFY_PRODUCT_COPILOT com os IDs dos produtos',
        'Faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
      ],
    },
    {
      id: 'pagtrust',
      name: 'PagTrust',
      path: '/api/webhooks/pagtrust',
      auth: { header: 'X-PagTrust-Token', envVar: 'PAGTRUST_TOKEN', configured: !!process.env.PAGTRUST_TOKEN },
      events: ['PAYMENT_APPROVED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK', 'SUBSCRIPTION_CANCELED'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da PagTrust',
      products: {
        starter: { label: '50 Scripts (Acesso Base)', envVar: 'PAGTRUST_PRODUCT_STARTER', configured: !!process.env.PAGTRUST_PRODUCT_STARTER },
        pro: { label: 'Plus (R$19,90)', envVar: 'PAGTRUST_PRODUCT_PRO', configured: !!process.env.PAGTRUST_PRODUCT_PRO },
        premium: { label: 'Pro (R$39,90)', envVar: 'PAGTRUST_PRODUCT_PREMIUM', configured: !!process.env.PAGTRUST_PRODUCT_PREMIUM },
        copilot: { label: 'Premium (R$99,90)', envVar: 'PAGTRUST_PRODUCT_COPILOT', configured: !!process.env.PAGTRUST_PRODUCT_COPILOT },
      },
      setupSteps: [
        'Acesse o painel da PagTrust e vá em Configurações > Notificações/Webhooks',
        'Adicione a URL do webhook acima',
        'Gere um token de segurança e configure na env var PAGTRUST_TOKEN no Vercel',
        'Selecione os eventos: PAYMENT_APPROVED, PAYMENT_REFUNDED, PAYMENT_CHARGEBACK, SUBSCRIPTION_CANCELED',
        'Configure as env vars PAGTRUST_PRODUCT_STARTER (produto base), PAGTRUST_PRODUCT_PRO, PAGTRUST_PRODUCT_PREMIUM e PAGTRUST_PRODUCT_COPILOT com os IDs dos produtos',
        'Faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
      ],
    },
  ];

  // Generic webhooks (access-grant, plan-upgrade, plan-cancel, stripe)
  const genericEndpoints = [
    {
      name: 'Liberação de Acesso (genérico)',
      path: '/api/webhooks/access-grant',
      auth: { header: 'X-Webhook-Secret', envVar: 'WEBHOOK_SECRET', configured: !!process.env.WEBHOOK_SECRET },
      events: ['access_grant'],
      description: 'Cria usuário e libera acesso via API externa (qualquer plataforma)',
    },
    {
      name: 'Upgrade de Plano (genérico)',
      path: '/api/webhooks/plan-upgrade',
      auth: { header: 'X-Webhook-Secret', envVar: 'WEBHOOK_SECRET', configured: !!process.env.WEBHOOK_SECRET },
      events: ['plan_upgrade'],
      description: 'Faz upgrade do plano de um usuário existente',
    },
    {
      name: 'Cancelamento (genérico)',
      path: '/api/webhooks/plan-cancel',
      auth: { header: 'X-Webhook-Secret', envVar: 'WEBHOOK_SECRET', configured: !!process.env.WEBHOOK_SECRET },
      events: ['plan_cancel'],
      description: 'Cancela o plano e volta para Starter',
    },
    {
      name: 'Stripe',
      path: '/api/webhooks/stripe',
      auth: { header: 'stripe-signature', envVar: 'STRIPE_WEBHOOK_SECRET', configured: !!process.env.STRIPE_WEBHOOK_SECRET },
      events: ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed'],
      description: 'Recebe eventos de pagamento do Stripe',
    },
  ];

  // Aggregate all env var statuses
  const envStatus: Record<string, boolean> = {
    // Hotmart
    HOTMART_HOTTOK: !!process.env.HOTMART_HOTTOK,
    HOTMART_PRODUCT_STARTER: !!process.env.HOTMART_PRODUCT_STARTER,
    HOTMART_PRODUCT_PRO: !!process.env.HOTMART_PRODUCT_PRO,
    HOTMART_PRODUCT_PREMIUM: !!process.env.HOTMART_PRODUCT_PREMIUM,
    HOTMART_PRODUCT_COPILOT: !!process.env.HOTMART_PRODUCT_COPILOT,
    // Kiwify
    KIWIFY_TOKEN: !!process.env.KIWIFY_TOKEN,
    KIWIFY_PRODUCT_STARTER: !!process.env.KIWIFY_PRODUCT_STARTER,
    KIWIFY_PRODUCT_PRO: !!process.env.KIWIFY_PRODUCT_PRO,
    KIWIFY_PRODUCT_PREMIUM: !!process.env.KIWIFY_PRODUCT_PREMIUM,
    KIWIFY_PRODUCT_COPILOT: !!process.env.KIWIFY_PRODUCT_COPILOT,
    // PagTrust
    PAGTRUST_TOKEN: !!process.env.PAGTRUST_TOKEN,
    PAGTRUST_PRODUCT_STARTER: !!process.env.PAGTRUST_PRODUCT_STARTER,
    PAGTRUST_PRODUCT_PRO: !!process.env.PAGTRUST_PRODUCT_PRO,
    PAGTRUST_PRODUCT_PREMIUM: !!process.env.PAGTRUST_PRODUCT_PREMIUM,
    PAGTRUST_PRODUCT_COPILOT: !!process.env.PAGTRUST_PRODUCT_COPILOT,
    // Generic
    WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };

  return NextResponse.json({
    baseUrl,
    envStatus,
    platforms,
    genericEndpoints,
  });
}
