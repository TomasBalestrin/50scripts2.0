import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
    const supabase = await createClient();

    // 1. Auth required
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Parse optional body for tone
    let toneUsed: string | null = null;
    try {
      const body = await request.json();
      if (body.tone_used) {
        toneUsed = body.tone_used;
      }
    } catch {
      // No body or invalid JSON is fine, tone_used is optional
    }

    // 3. Verify script exists and get current usage count
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select('id, global_usage_count')
      .eq('id', scriptId)
      .eq('is_active', true)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // 4. Insert into script_usage
    const { data: usage, error: usageError } = await supabase
      .from('script_usage')
      .insert({
        user_id: userId,
        script_id: scriptId,
        tone_used: toneUsed,
      })
      .select()
      .single();

    if (usageError) {
      console.error('[scripts/id/use] Error inserting usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to register usage' },
        { status: 500 }
      );
    }

    // 5. Increment global_usage_count directly (no RPC needed)
    const currentCount = (script as Record<string, unknown>).global_usage_count as number ?? 0;
    const { error: incrementError } = await supabase
      .from('scripts')
      .update({ global_usage_count: currentCount + 1 })
      .eq('id', scriptId);

    if (incrementError) {
      console.error('[scripts/id/use] Error incrementing usage count:', incrementError);
    }

    // 6. Add +2 cyclic XP for copying a script
    await supabase.rpc('add_cyclic_xp', { p_user_id: userId, p_xp: 2 });

    return NextResponse.json(
      { usage },
      { status: 201 }
    );
  } catch (error) {
    console.error('[scripts/id/use] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
