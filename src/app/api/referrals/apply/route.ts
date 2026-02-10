import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { referral_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const { referral_code } = body;
  if (!referral_code || typeof referral_code !== 'string') {
    return NextResponse.json(
      { error: 'Código de indicação é obrigatório' },
      { status: 400 }
    );
  }

  const code = referral_code.trim().toUpperCase();

  // Prevent self-referral
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, referral_code, referred_by, created_at')
    .eq('id', user.id)
    .single();

  if (!currentProfile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  if (currentProfile.referral_code === code) {
    return NextResponse.json(
      { error: 'Você não pode usar seu próprio código' },
      { status: 400 }
    );
  }

  if (currentProfile.referred_by) {
    return NextResponse.json(
      { error: 'Você já utilizou um código de indicação' },
      { status: 400 }
    );
  }

  // Anti-fraud: account must be at least 24h old to apply referral
  const accountAge = Date.now() - new Date(currentProfile.created_at).getTime();
  const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  if (accountAge < MIN_ACCOUNT_AGE_MS) {
    return NextResponse.json(
      { error: 'Sua conta precisa ter pelo menos 24 horas para usar um código de indicação' },
      { status: 400 }
    );
  }

  // Anti-fraud: account must have used at least 1 script
  const { count: usageCount } = await supabase
    .from('script_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!usageCount || usageCount < 1) {
    return NextResponse.json(
      { error: 'Use pelo menos 1 script antes de aplicar um código de indicação' },
      { status: 400 }
    );
  }

  // Find the referrer by their referral code
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, ai_credits_remaining, plan')
    .eq('referral_code', code)
    .single();

  if (!referrer) {
    return NextResponse.json(
      { error: 'Código de indicação não encontrado' },
      { status: 404 }
    );
  }

  // Check if referral already exists between these users
  const { data: existingReferral } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', user.id)
    .single();

  if (existingReferral) {
    return NextResponse.json(
      { error: 'Indicação já registrada' },
      { status: 400 }
    );
  }

  // Create the referral record
  const { error: insertError } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referral_code_used: code,
      status: 'converted',
    });

  if (insertError) {
    console.error('Erro ao criar referral:', insertError);
    return NextResponse.json(
      { error: 'Erro ao registrar indicação' },
      { status: 500 }
    );
  }

  // Mark current user as referred
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', user.id);

  // Count total converted referrals for the referrer
  const { count: convertedCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id)
    .in('status', ['converted', 'rewarded']);

  const totalConverted = convertedCount ?? 0;

  // Determine and apply rewards based on tier thresholds
  let rewardType: string | null = null;

  // Tier 1: 1 converted referral -> +3 AI credits
  if (totalConverted >= 1) {
    // Check if this reward was already granted
    const { data: existingTier1 } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer.id)
      .eq('reward_type', '3_ai_credits')
      .single();

    if (!existingTier1) {
      rewardType = '3_ai_credits';

      // Add 3 AI credits to referrer
      await supabase
        .from('profiles')
        .update({
          ai_credits_remaining: referrer.ai_credits_remaining + 3,
        })
        .eq('id', referrer.id);

      // Update referral status and reward_type
      await supabase
        .from('referrals')
        .update({
          status: 'rewarded' as const,
          reward_type: '3_ai_credits',
          reward_granted_at: new Date().toISOString(),
        })
        .eq('referrer_id', referrer.id)
        .eq('referred_id', user.id);
    }
  }

  // Tier 2: 3 converted referrals -> free Pro month
  if (totalConverted >= 3) {
    const { data: existingTier2 } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer.id)
      .eq('reward_type', 'free_pro_month')
      .single();

    if (!existingTier2) {
      rewardType = 'free_pro_month';

      // Set referrer plan to pro with 30 day expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', referrer.id);

      // Find the referral that triggered this tier and mark it rewarded
      // Use the latest unrewarded converted referral
      const { data: latestConverted } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .eq('status', 'converted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestConverted) {
        await supabase
          .from('referrals')
          .update({
            status: 'rewarded' as const,
            reward_type: 'free_pro_month',
            reward_granted_at: new Date().toISOString(),
          })
          .eq('id', latestConverted.id);
      }
    }
  }

  // Tier 3: 10 converted referrals -> free Premium month
  if (totalConverted >= 10) {
    const { data: existingTier3 } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer.id)
      .eq('reward_type', 'free_premium_month')
      .single();

    if (!existingTier3) {
      rewardType = 'free_premium_month';

      // Set referrer plan to premium with 30 day expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', referrer.id);

      const { data: latestConverted } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .eq('status', 'converted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestConverted) {
        await supabase
          .from('referrals')
          .update({
            status: 'rewarded' as const,
            reward_type: 'free_premium_month',
            reward_granted_at: new Date().toISOString(),
          })
          .eq('id', latestConverted.id);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Código aplicado com sucesso!',
    reward_granted: rewardType,
  });
}
