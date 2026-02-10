import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const userId = user.id;

    // 2. Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, plan')
      .eq('id', userId)
      .single();

    // 3. Get total scripts used by this user
    const { count: totalScriptsUsed } = await supabase
      .from('script_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // 3. Get most used scripts (top 5 by usage count for this user)
    const { data: usageData } = await supabase
      .from('script_usage')
      .select('script_id')
      .eq('user_id', userId);

    // Count occurrences of each script_id
    const scriptCounts: Record<string, number> = {};
    (usageData ?? []).forEach((row) => {
      scriptCounts[row.script_id] = (scriptCounts[row.script_id] || 0) + 1;
    });

    // Sort by count and take top 5
    const topScriptIds = Object.entries(scriptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let mostUsedScripts: Array<Record<string, unknown>> = [];
    if (topScriptIds.length > 0) {
      const { data: scripts } = await supabase
        .from('scripts')
        .select(`
          id, title, context_description, global_effectiveness,
          category:script_categories(id, name, slug, icon, color)
        `)
        .in('id', topScriptIds);

      mostUsedScripts = (scripts ?? []).map((script) => ({
        ...script,
        usage_count: scriptCounts[script.id] ?? 0,
      }))
      .sort((a, b) => (b.usage_count as number) - (a.usage_count as number));
    }

    // 4. Calculate trail progress - 3 parallel queries instead of N+1
    const [
      { data: categories },
      { data: allActiveScripts },
      { data: allUserUsage },
    ] = await Promise.all([
      supabase
        .from('script_categories')
        .select('id, name, slug, icon, color')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('scripts')
        .select('id, category_id')
        .eq('is_active', true),
      supabase
        .from('script_usage')
        .select('script_id, scripts!inner(category_id)')
        .eq('user_id', userId),
    ]);

    // Count total scripts per category in memory
    const totalPerCategory: Record<string, number> = {};
    (allActiveScripts ?? []).forEach((s: { id: string; category_id: string }) => {
      totalPerCategory[s.category_id] = (totalPerCategory[s.category_id] || 0) + 1;
    });

    // Count unique used scripts per category in memory
    const usedPerCategory: Record<string, Set<string>> = {};
    (allUserUsage ?? []).forEach((r: { script_id: string; scripts: { category_id: string } | { category_id: string }[] }) => {
      const catId = Array.isArray(r.scripts) ? r.scripts[0]?.category_id : r.scripts?.category_id;
      if (catId) {
        if (!usedPerCategory[catId]) usedPerCategory[catId] = new Set();
        usedPerCategory[catId].add(r.script_id);
      }
    });

    const trailProgress = (categories ?? []).map((category) => {
      const totalInCategory = totalPerCategory[category.id] || 0;
      const uniqueUsed = usedPerCategory[category.id]?.size || 0;
      return {
        category,
        used: uniqueUsed,
        total: totalInCategory,
        progress: totalInCategory
          ? Math.round((uniqueUsed / totalInCategory) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      profile: {
        full_name: userProfile?.full_name || '',
        plan: userProfile?.plan || 'starter',
      },
      stats: {
        scripts_used: totalScriptsUsed ?? 0,
        total_scripts: 50,
        sales_count: 0,
        total_sales_value: 0,
      },
      trails: (trailProgress ?? []).map((t) => ({
        name: t.category.name,
        icon: t.category.icon,
        slug: t.category.slug,
        color: t.category.color,
        used: t.used,
        total: t.total,
      })),
      total_scripts_used: totalScriptsUsed ?? 0,
      most_used_scripts: mostUsedScripts,
      trail_progress: trailProgress,
    });
  } catch (error) {
    console.error('[dashboard/basic] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
