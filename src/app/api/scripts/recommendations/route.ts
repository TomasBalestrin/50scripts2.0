import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

const TIME_CATEGORY_MAP: Record<string, string> = {
  morning: 'abordagem-inicial',    // 6-11
  midday: 'qualificacao',          // 11-14
  afternoon: 'follow-up',          // 14-18
  evening: 'fechamento',           // 18-22
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';

  // Default to approach for off-hours
  return 'morning';
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Auth required
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, niche')
      .eq('id', user.id)
      .single();

    const userPlan: Plan = (profile?.plan as Plan) ?? 'starter';

    // 3. Determine recommended category based on time of day
    const timeOfDay = getTimeOfDay();
    const categorySlug = TIME_CATEGORY_MAP[timeOfDay];

    // 4. Get the category
    const { data: category, error: catError } = await supabase
      .from('script_categories')
      .select('id, name, slug, icon, color')
      .eq('slug', categorySlug)
      .eq('is_active', true)
      .single();

    if (catError || !category) {
      return NextResponse.json(
        { error: 'Recommended category not found' },
        { status: 404 }
      );
    }

    // 5. Get top 5 scripts from suggested category by global_effectiveness
    const { data: scripts, error: scriptsError } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('global_effectiveness', { ascending: false })
      .limit(5);

    if (scriptsError) {
      console.error('[scripts/recommendations] Error:', scriptsError);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 }
      );
    }

    // 6. Mark locked scripts
    const recommendations = (scripts ?? []).map((script) => ({
      ...script,
      is_locked: !hasAccess(userPlan, script.min_plan as Plan),
    }));

    return NextResponse.json({
      time_of_day: timeOfDay,
      suggested_category: category,
      niche: profile?.niche ?? null,
      scripts: recommendations,
    });
  } catch (error) {
    console.error('[scripts/recommendations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
