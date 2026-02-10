import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import { cachedJson } from '@/lib/api-cache';
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

  return 'morning';
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Auth required
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ scripts: [] });
    }

    // 2. Get user profile + category in parallel
    const timeOfDay = getTimeOfDay();
    const categorySlug = TIME_CATEGORY_MAP[timeOfDay];

    const [{ data: profile }, { data: category }] = await Promise.all([
      supabase
        .from('profiles')
        .select('plan, niche')
        .eq('id', user.id)
        .single(),
      supabase
        .from('script_categories')
        .select('id, name, slug, icon, color')
        .eq('slug', categorySlug)
        .eq('is_active', true)
        .single(),
    ]);

    const userPlan: Plan = (profile?.plan as Plan) ?? 'starter';

    if (!category) {
      // Fallback: try to get any active category
      const { data: anyCategory } = await supabase
        .from('script_categories')
        .select('id, name, slug, icon, color')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!anyCategory) {
        return NextResponse.json({ scripts: [] });
      }

      // Use the fallback category
      const { data: scripts } = await supabase
        .from('scripts')
        .select('*, category:script_categories(*)')
        .eq('category_id', anyCategory.id)
        .eq('is_active', true)
        .order('global_effectiveness', { ascending: false })
        .limit(5);

      return cachedJson({
        time_of_day: timeOfDay,
        suggested_category: anyCategory,
        scripts: (scripts ?? []).map((s) => ({
          ...s,
          is_locked: !hasAccess(userPlan, s.min_plan as Plan),
        })),
      }, { maxAge: 300, staleWhileRevalidate: 600 });
    }

    // 5. Get top 5 scripts from suggested category
    const { data: scripts } = await supabase
      .from('scripts')
      .select('*, category:script_categories(*)')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('global_effectiveness', { ascending: false })
      .limit(5);

    return cachedJson({
      time_of_day: timeOfDay,
      suggested_category: category,
      niche: profile?.niche ?? null,
      scripts: (scripts ?? []).map((s) => ({
        ...s,
        is_locked: !hasAccess(userPlan, s.min_plan as Plan),
      })),
    }, { maxAge: 300, staleWhileRevalidate: 600 });
  } catch (error) {
    console.error('[scripts/recommendations] Error:', error);
    return NextResponse.json({ scripts: [] });
  }
}
