import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

const FALLBACK_TIP = {
  content: 'Mensagens personalizadas convertem 3x mais que mensagens genéricas. Use o nome do lead!',
  category: 'vendas',
};

const TIME_CATEGORY_MAP: Record<string, string> = {
  morning: 'abordagem-inicial',
  midday: 'qualificacao',
  afternoon: 'follow-up',
  evening: 'fechamento',
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

    // 1. Single auth call
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;

    // 2. ALL data in 5 parallel queries (replaces ~30 sequential queries)
    const [profileRes, categoriesRes, tipsRes, allScriptsRes, userUsageRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, plan, niche')
        .eq('id', userId)
        .single(),
      supabase
        .from('script_categories')
        .select('id, name, slug, icon, color')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('microlearning_tips')
        .select('id, content, category, display_count')
        .eq('is_active', true),
      supabase
        .from('scripts')
        .select('id, title, category_id, context_description, global_effectiveness, global_usage_count, min_plan')
        .eq('is_active', true),
      supabase
        .from('script_usage')
        .select('script_id')
        .eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    const categories = categoriesRes.data ?? [];
    const tips = tipsRes.data;
    const allScripts = allScriptsRes.data ?? [];
    const userUsage = userUsageRes.data ?? [];

    const userPlan: Plan = (profile?.plan as Plan) ?? 'starter';
    const totalScriptsUsed = userUsage.length;

    // 3. Build lookup maps (all computed in memory, zero extra DB calls)
    const scriptsMap = new Map(allScripts.map(s => [s.id, s]));
    const categoriesMap = new Map(categories.map(c => [c.id, c]));

    // 4. Trail progress: count scripts per category + unique user scripts per category
    const scriptsByCategory: Record<string, number> = {};
    allScripts.forEach(s => {
      scriptsByCategory[s.category_id] = (scriptsByCategory[s.category_id] || 0) + 1;
    });

    const usedByCategory: Record<string, Set<string>> = {};
    userUsage.forEach(u => {
      const catId = scriptsMap.get(u.script_id)?.category_id;
      if (catId) {
        if (!usedByCategory[catId]) usedByCategory[catId] = new Set();
        usedByCategory[catId].add(u.script_id);
      }
    });

    const trails = categories.map(cat => {
      const total = scriptsByCategory[cat.id] || 0;
      const used = usedByCategory[cat.id]?.size || 0;
      return {
        name: cat.name,
        icon: cat.icon,
        slug: cat.slug,
        color: cat.color,
        used,
        total,
      };
    });

    // 5. Most used scripts (computed from usage data in memory)
    const scriptUsageCounts: Record<string, number> = {};
    userUsage.forEach(u => {
      scriptUsageCounts[u.script_id] = (scriptUsageCounts[u.script_id] || 0) + 1;
    });

    const topScriptIds = Object.entries(scriptUsageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const mostUsedScripts = topScriptIds
      .map(id => {
        const s = scriptsMap.get(id);
        if (!s) return null;
        return {
          ...s,
          category: categoriesMap.get(s.category_id) || null,
          usage_count: scriptUsageCounts[id],
        };
      })
      .filter(Boolean);

    // 6. Random tip
    let tip: Record<string, unknown> = FALLBACK_TIP;
    if (tips && tips.length > 0) {
      const randomIndex = Math.floor(Math.random() * tips.length);
      const selected = tips[randomIndex];
      tip = selected;
      // Fire and forget display count increment
      supabase
        .from('microlearning_tips')
        .update({ display_count: (selected.display_count ?? 0) + 1 })
        .eq('id', selected.id)
        .then(() => {});
    }

    // 7. Time-based recommendations (computed from already-loaded data)
    const timeOfDay = getTimeOfDay();
    const categorySlug = TIME_CATEGORY_MAP[timeOfDay];
    const suggestedCategory = categories.find(c => c.slug === categorySlug) || categories[0] || null;

    const recommendedScripts = suggestedCategory
      ? allScripts
          .filter(s => s.category_id === suggestedCategory.id)
          .sort((a, b) => b.global_effectiveness - a.global_effectiveness)
          .slice(0, 5)
          .map(s => ({
            ...s,
            category: suggestedCategory,
            is_locked: !hasAccess(userPlan, s.min_plan as Plan),
          }))
      : [];

    // 8. Build response
    const response = NextResponse.json({
      profile: {
        full_name: profile?.full_name || '',
        plan: profile?.plan || 'starter',
      },
      stats: {
        scripts_used: totalScriptsUsed,
        total_scripts: allScripts.length,
        sales_count: 0,
        total_sales_value: 0,
      },
      trails,
      most_used_scripts: mostUsedScripts,
      tip,
      recommendations: {
        time_of_day: timeOfDay,
        suggested_category: suggestedCategory,
        scripts: recommendedScripts,
      },
    });

    // Cache for 60s, serve stale for 120s while revalidating
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

    return response;
  } catch (error) {
    console.error('[dashboard/all] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
