import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try RPC first, fall back to manual update
  const rpcRes = await supabase.rpc('collect_streak_reward', {
    p_user_id: user.id,
  });

  if (rpcRes.error) {
    // RPC doesn't exist or failed – fall back to a direct update
    const { data: profile } = await supabase
      .from('profiles')
      .select('bonus_scripts')
      .eq('id', user.id)
      .single();

    const currentBonus = profile?.bonus_scripts ?? 0;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        streak_reward_pending: false,
        bonus_scripts: currentBonus + 5,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
