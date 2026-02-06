import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // 1. Get user plan
    const { data: { user } } = await supabase.auth.getUser();

    let userPlan: Plan = 'starter';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profile) {
        userPlan = profile.plan as Plan;
      }
    }

    // 2. Search scripts by title and content using ILIKE
    const searchTerm = `%${query.trim()}%`;

    const { data: scripts, error } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('is_active', true)
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .order('global_effectiveness', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[scripts/search] Error searching scripts:', error);
      return NextResponse.json(
        { error: 'Failed to search scripts' },
        { status: 500 }
      );
    }

    // 3. Filter by user plan and mark locked scripts
    const results = (scripts ?? []).map((script) => ({
      ...script,
      is_locked: !hasAccess(userPlan, script.min_plan as Plan),
    }));

    return NextResponse.json({
      scripts: results,
      total: results.length,
      query: query.trim(),
    });
  } catch (error) {
    console.error('[scripts/search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
