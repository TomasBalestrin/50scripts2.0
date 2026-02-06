import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_prefs, push_subscription')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    prefs: profile?.notification_prefs || {},
    subscribed: !!profile?.push_subscription,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prefs } = await request.json();

  await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', user.id);

  return NextResponse.json({ success: true });
}
