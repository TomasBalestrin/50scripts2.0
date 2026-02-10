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
    .select('referral_code')
    .eq('id', user.id)
    .single();

  const { data: referrals } = await supabase
    .from('referrals')
    .select(`
      *,
      referred:profiles!referred_id(email, full_name, plan)
    `)
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  const totalReferrals = referrals?.length || 0;
  const convertedReferrals = referrals?.filter((r) => r.status !== 'pending').length || 0;
  const rewardedReferrals = referrals?.filter((r) => r.status === 'rewarded').length || 0;

  // Check rewards eligibility
  const rewards = [];
  if (totalReferrals >= 1 && !referrals?.some((r) => r.reward_type === 'ai_credits')) {
    rewards.push({ threshold: 1, type: 'ai_credits', label: '3 créditos IA', unlocked: true });
  }
  if (totalReferrals >= 3) {
    rewards.push({ threshold: 3, type: 'free_month_pro', label: '1 mês Plus grátis', unlocked: totalReferrals >= 3 });
  }
  if (totalReferrals >= 10) {
    rewards.push({ threshold: 10, type: 'free_month_premium', label: '1 mês Pro grátis', unlocked: totalReferrals >= 10 });
  }

  return NextResponse.json({
    referral_code: profile?.referral_code || '',
    referrals: referrals || [],
    stats: {
      total: totalReferrals,
      converted: convertedReferrals,
      rewarded: rewardedReferrals,
    },
    rewards,
  });
}
