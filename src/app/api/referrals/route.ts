import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    // Get referrals made by this user
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*, referred:profiles!referrals_referred_id_fkey(email, full_name, plan)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    const totalReferrals = referrals?.length || 0;
    const convertedReferrals = referrals?.filter((r) => r.status === 'converted' || r.status === 'rewarded').length || 0;

    return NextResponse.json({
      referral_code: profile.referral_code,
      referrals: referrals || [],
      stats: {
        total: totalReferrals,
        converted: convertedReferrals,
        pending: totalReferrals - convertedReferrals,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
