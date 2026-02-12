import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run ALL 4 queries in parallel (was sequential before)
  const [profileRes, badgesRes, usageRes, salesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('xp_points, level, current_streak, longest_streak')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
    supabase
      .from('script_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('script_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('resulted_in_sale', true),
  ]);

  const profile = profileRes.data;
  const badges = badgesRes.data;
  const totalUsage = usageRes.count;
  const totalSales = salesRes.count;

  const response = NextResponse.json({
    xp_points: profile?.xp_points || 0,
    level: profile?.level || 'iniciante',
    current_streak: profile?.current_streak || 0,
    longest_streak: profile?.longest_streak || 0,
    badges: badges || [],
    stats: {
      total_scripts_used: totalUsage || 0,
      total_sales: totalSales || 0,
    },
  });

  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
  return response;
}
