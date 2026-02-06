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
    .select('ai_credits_remaining, ai_credits_monthly, plan')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    credits_remaining: profile?.ai_credits_monthly === -1 ? -1 : (profile?.ai_credits_remaining || 0),
    credits_monthly: profile?.ai_credits_monthly || 0,
    plan: profile?.plan || 'starter',
  });
}
