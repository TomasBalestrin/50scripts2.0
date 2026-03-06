import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch today's daily missions for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_or_assign_daily_missions', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('[missions] Error fetching missions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch missions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ missions: data ?? [] });
  } catch (err) {
    console.error('[missions] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Complete a daily mission
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mission_id } = body as { mission_id?: string };

    if (!mission_id) {
      return NextResponse.json(
        { error: 'mission_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('complete_daily_mission', {
      p_user_id: user.id,
      p_mission_id: mission_id,
    });

    if (error) {
      console.error('[missions] Error completing mission:', error);
      return NextResponse.json(
        { error: 'Failed to complete mission' },
        { status: 500 }
      );
    }

    if (data?.error) {
      return NextResponse.json(
        { error: data.error, already_completed: data.already_completed },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      xp_awarded: data?.xp_awarded ?? 20,
      xp_result: data?.xp_result,
    });
  } catch (err) {
    console.error('[missions] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
