import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_type, earned_at')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  const ALL_BADGES = [
    { type: 'first_script', name: 'Primeiro Script', icon: '📝', description: 'Usou o primeiro script' },
    { type: 'first_sale', name: 'Primeira Venda', icon: '💰', description: 'Registrou a primeira venda' },
    { type: 'streak_7', name: 'Constância', icon: '🔥', description: '7 dias seguidos de uso' },
    { type: 'streak_30', name: 'Imparável', icon: '⚡', description: '30 dias seguidos de uso' },
    { type: 'scripts_50', name: 'Mestre dos Scripts', icon: '📚', description: 'Usou todos os 50 scripts' },
    { type: 'revenue_10k', name: 'R$ 10K Club', icon: '🏆', description: 'R$ 10.000 em vendas registradas' },
    { type: 'all_trails', name: 'Explorador', icon: '🗺️', description: 'Usou scripts de todas as trilhas' },
    { type: 'ai_10', name: 'Criador IA', icon: '🤖', description: 'Gerou 10 scripts com IA' },
    { type: 'referrals_5', name: 'Influencer', icon: '🌟', description: '5 indicações bem-sucedidas' },
  ];

  const earnedTypes = new Set(badges?.map((b) => b.badge_type) || []);

  const allBadges = ALL_BADGES.map((badge) => ({
    ...badge,
    earned: earnedTypes.has(badge.type),
    earned_at: badges?.find((b) => b.badge_type === badge.type)?.earned_at || null,
  }));

  return NextResponse.json({ badges: allBadges });
}
