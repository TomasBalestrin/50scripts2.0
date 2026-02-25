import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // All queries in parallel - no N+1
    const [
      profileRes,
      categoriesRes,
      scriptUsageRes,
      personalizedRes,
      salesRes,
    ] = await Promise.all([
      // 1. Profile (gamification + name)
      supabase
        .from('profiles')
        .select(
          'full_name, active_days, new_level, cyclic_xp, current_streak, bonus_scripts, streak_reward_pending, cyclic_xp_reward_pending'
        )
        .eq('id', userId)
        .single(),

      // 2. All active categories
      supabase
        .from('script_categories')
        .select('id, name, slug, icon, color')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      // 3. Script usage (with script_id to map to category)
      supabase
        .from('script_usage')
        .select('id, script_id')
        .eq('user_id', userId),

      // 4. Personalized scripts count
      supabase
        .from('personalized_scripts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // 5. Sales with value + script_id for trail breakdown
      supabase
        .from('script_sales')
        .select('id, script_id, sale_value')
        .eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    const categories = categoriesRes.data ?? [];
    const scriptUsages = scriptUsageRes.data ?? [];
    const sales = salesRes.data ?? [];
    const personalizedCount = personalizedRes.count ?? 0;

    // If profile has no full_name, try user_onboarding as fallback
    let resolvedName = profile?.full_name || '';
    if (!resolvedName) {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      resolvedName = onboarding?.full_name || user.email?.split('@')[0] || '';
    }

    // We need script -> category mapping for trail breakdown.
    // Collect all unique script IDs from usage + sales.
    const allScriptIds = new Set<string>();
    scriptUsages.forEach((u) => allScriptIds.add(u.script_id));
    sales.forEach((s) => allScriptIds.add(s.script_id));

    // Single query to get script->category mapping
    let scriptCategoryMap = new Map<string, string>();
    if (allScriptIds.size > 0) {
      const { data: scripts } = await supabase
        .from('scripts')
        .select('id, category_id')
        .in('id', Array.from(allScriptIds));

      if (scripts) {
        scriptCategoryMap = new Map(scripts.map((s) => [s.id, s.category_id]));
      }
    }

    // Build trail progress from in-memory data
    const usageByCategory = new Map<string, Set<string>>();
    scriptUsages.forEach((u) => {
      const catId = scriptCategoryMap.get(u.script_id);
      if (catId) {
        if (!usageByCategory.has(catId)) usageByCategory.set(catId, new Set());
        usageByCategory.get(catId)!.add(u.script_id);
      }
    });

    const salesByCategory = new Map<
      string,
      { count: number; total: number }
    >();
    sales.forEach((s) => {
      const catId = scriptCategoryMap.get(s.script_id);
      if (catId) {
        const existing = salesByCategory.get(catId) || {
          count: 0,
          total: 0,
        };
        existing.count += 1;
        existing.total += s.sale_value ?? 0;
        salesByCategory.set(catId, existing);
      }
    });

    const trails = categories.map((cat) => {
      const catSales = salesByCategory.get(cat.id);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        scriptsUsed: usageByCategory.get(cat.id)?.size ?? 0,
        salesCount: catSales?.count ?? 0,
        salesTotal: catSales?.total ?? 0,
      };
    });

    // Unique scripts used (distinct script_ids)
    const uniqueScriptsUsed = new Set(scriptUsages.map((u) => u.script_id))
      .size;

    // Sales totals
    const salesCount = sales.length;
    const salesTotal = sales.reduce((sum, s) => sum + (s.sale_value ?? 0), 0);

    const response = NextResponse.json({
      userName: resolvedName,
      // Gamification
      activeDays: profile?.active_days ?? 0,
      level: profile?.new_level ?? 'iniciante',
      cyclicXp: profile?.cyclic_xp ?? 0,
      streak: profile?.current_streak ?? 0,
      bonusScripts: profile?.bonus_scripts ?? 0,
      streakRewardPending: profile?.streak_reward_pending ?? false,
      cyclicXpRewardPending: profile?.cyclic_xp_reward_pending ?? false,
      // Indicators
      scriptsUsed: uniqueScriptsUsed,
      personalizedGenerated: personalizedCount,
      salesCount,
      salesTotal,
      // Trail progress
      trails,
    });

    response.headers.set(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60'
    );

    return response;
  } catch (error) {
    console.error('[dashboard/all] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
