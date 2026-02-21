import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformConfig } from '@/lib/webhooks/platform-config';

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

  // Load effective configs from DB + env fallback (same source the webhook handlers use)
  const [hotmartConfig, kiwifyConfig, pagtrustConfig] = await Promise.all([
    getPlatformConfig('hotmart'),
    getPlatformConfig('kiwify'),
    getPlatformConfig('pagtrust'),
  ]);

  const effectiveConfigs: Record<string, { token: string; products: Record<string, string> }> = {
    hotmart: hotmartConfig,
    kiwify: kiwifyConfig,
    pagtrust: pagtrustConfig,
  };

  // Platform configurations
  const platforms = [
    {
      id: 'hotmart',
      name: 'Hotmart',
      path: '/api/webhooks/hotmart',
      auth: { header: 'X-Hotmart-Hottok', envVar: 'HOTMART_HOTTOK', configured: !!effectiveConfigs.hotmart.token },
      events: ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'SUBSCRIPTION_CANCELLATION'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da Hotmart',
      products: {
        starter: { label: 'Script Go (Acesso Base)', envVar: 'HOTMART_PRODUCT_STARTER', configured: !!effectiveConfigs.hotmart.products.starter },
        pro: { label: 'Plus (R$19,90)', envVar: 'HOTMART_PRODUCT_PRO', configured: !!effectiveConfigs.hotmart.products.pro },
        premium: { label: 'Pro (R$39,90)', envVar: 'HOTMART_PRODUCT_PREMIUM', configured: !!effectiveConfigs.hotmart.products.premium },
        copilot: { label: 'Premium (R$99,90)', envVar: 'HOTMART_PRODUCT_COPILOT', configured: !!effectiveConfigs.hotmart.products.copilot },
      },
      setupSteps: [
        'Acesse o painel da Hotmart e vá em Ferramentas > Webhooks (API de Notificações)',
        'Clique em Configurações e adicione a URL do webhook acima',
        'Defina o token de autenticação acima (o mesmo Hottok configurado no painel da Hotmart)',
        'Selecione os eventos: PURCHASE_COMPLETE, PURCHASE_CANCELED, PURCHASE_REFUNDED, SUBSCRIPTION_CANCELLATION',
        'Preencha os IDs dos produtos acima para cada plano',
        'Clique em Salvar e faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
      ],
    },
    {
      id: 'kiwify',
      name: 'Kiwify',
      path: '/api/webhooks/kiwify',
      auth: { header: 'X-Kiwify-Token', envVar: 'KIWIFY_TOKEN', configured: !!effectiveConfigs.kiwify.token },
      events: ['order_paid', 'order_refunded', 'subscription_canceled', 'chargeback'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da Kiwify',
      products: {
        starter: { label: 'Script Go (Acesso Base)', envVar: 'KIWIFY_PRODUCT_STARTER', configured: !!effectiveConfigs.kiwify.products.starter },
        pro: { label: 'Plus (R$19,90)', envVar: 'KIWIFY_PRODUCT_PRO', configured: !!effectiveConfigs.kiwify.products.pro },
        premium: { label: 'Pro (R$39,90)', envVar: 'KIWIFY_PRODUCT_PREMIUM', configured: !!effectiveConfigs.kiwify.products.premium },
        copilot: { label: 'Premium (R$99,90)', envVar: 'KIWIFY_PRODUCT_COPILOT', configured: !!effectiveConfigs.kiwify.products.copilot },
      },
      setupSteps: [
        'Acesse o painel da Kiwify e vá em Configurações > Webhooks',
        'Adicione a URL do webhook acima',
        'Defina o token de autenticação acima (o mesmo token configurado no painel da Kiwify)',
        'Selecione os eventos: order_paid, order_refunded, subscription_canceled, chargeback',
        'Preencha os IDs dos produtos acima para cada plano',
        'Clique em Salvar e faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
      ],
    },
    {
      id: 'pagtrust',
      name: 'PagTrust',
      path: '/api/webhooks/pagtrust',
      auth: { header: 'X-PagTrust-Token', envVar: 'PAGTRUST_TOKEN', configured: !!effectiveConfigs.pagtrust.token },
      events: ['PAYMENT_APPROVED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK', 'SUBSCRIPTION_CANCELED'],
      description: 'Recebe eventos de compra, cancelamento e reembolso da PagTrust',
      products: {
        starter: { label: 'Script Go (Acesso Base)', envVar: 'PAGTRUST_PRODUCT_STARTER', configured: !!effectiveConfigs.pagtrust.products.starter },
        pro: { label: 'Plus (R$19,90)', envVar: 'PAGTRUST_PRODUCT_PRO', configured: !!effectiveConfigs.pagtrust.products.pro },
        premium: { label: 'Pro (R$39,90)', envVar: 'PAGTRUST_PRODUCT_PREMIUM', configured: !!effectiveConfigs.pagtrust.products.premium },
        copilot: { label: 'Premium (R$99,90)', envVar: 'PAGTRUST_PRODUCT_COPILOT', configured: !!effectiveConfigs.pagtrust.products.copilot },
      },
      setupSteps: [
        'Acesse o painel da PagTrust e vá em Configurações > Notificações/Webhooks',
        'Adicione a URL do webhook acima',
        'Defina o token de autenticação acima (o mesmo token configurado no painel da PagTrust)',
        'Selecione os eventos: PAYMENT_APPROVED, PAYMENT_REFUNDED, PAYMENT_CHARGEBACK, SUBSCRIPTION_CANCELED',
        'Preencha os IDs dos produtos acima para cada plano',
        'Clique em Salvar e faça uma compra de teste para validar. Acompanhe em Admin > Webhooks',
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

  // Aggregate all effective statuses
  const envStatus: Record<string, boolean> = {
    // Hotmart
    HOTMART_HOTTOK: !!effectiveConfigs.hotmart.token,
    HOTMART_PRODUCT_STARTER: !!effectiveConfigs.hotmart.products.starter,
    HOTMART_PRODUCT_PRO: !!effectiveConfigs.hotmart.products.pro,
    HOTMART_PRODUCT_PREMIUM: !!effectiveConfigs.hotmart.products.premium,
    HOTMART_PRODUCT_COPILOT: !!effectiveConfigs.hotmart.products.copilot,
    // Kiwify
    KIWIFY_TOKEN: !!effectiveConfigs.kiwify.token,
    KIWIFY_PRODUCT_STARTER: !!effectiveConfigs.kiwify.products.starter,
    KIWIFY_PRODUCT_PRO: !!effectiveConfigs.kiwify.products.pro,
    KIWIFY_PRODUCT_PREMIUM: !!effectiveConfigs.kiwify.products.premium,
    KIWIFY_PRODUCT_COPILOT: !!effectiveConfigs.kiwify.products.copilot,
    // PagTrust
    PAGTRUST_TOKEN: !!effectiveConfigs.pagtrust.token,
    PAGTRUST_PRODUCT_STARTER: !!effectiveConfigs.pagtrust.products.starter,
    PAGTRUST_PRODUCT_PRO: !!effectiveConfigs.pagtrust.products.pro,
    PAGTRUST_PRODUCT_PREMIUM: !!effectiveConfigs.pagtrust.products.premium,
    PAGTRUST_PRODUCT_COPILOT: !!effectiveConfigs.pagtrust.products.copilot,
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
