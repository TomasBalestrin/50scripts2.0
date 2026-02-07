import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PLAN_PRICES } from '@/lib/payments/stripe';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nao autorizado. Faca login para continuar.' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { plan, success_url, cancel_url } = body;

    const validPlans = ['pro', 'premium', 'copilot'];
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Plano invalido. Escolha entre: pro, premium, copilot.' },
        { status: 400 }
      );
    }

    // 3. Get the price ID for the selected plan
    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Preco do plano nao configurado. Contate o suporte.' },
        { status: 500 }
      );
    }

    // 4. Resolve URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resolvedSuccessUrl = success_url || `${appUrl}/upgrade?success=true`;
    const resolvedCancelUrl = cancel_url || `${appUrl}/upgrade?cancelled=true`;

    // 5. Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    // 6. Create Stripe checkout session
    const sessionParams: Record<string, unknown> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
      },
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
    };

    // Use existing customer or set email for new one
    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = profile?.email || user.email;
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return NextResponse.json(
      { url: session.url },
      { status: 200 }
    );
  } catch (error) {
    console.error('[payments/checkout] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessao de pagamento. Tente novamente.' },
      { status: 500 }
    );
  }
}
