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

    // 4. Calculate trail progress (used scripts per category / total scripts in category)
    const { data: categories } = await supabase
      .from('script_categories')
      .select('id, name, slug, icon, color')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const trailProgress = await Promise.all(
      (categories ?? []).map(async (category) => {
        // Total active scripts in this category
        const { count: totalInCategory } = await supabase
          .from('scripts')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('is_active', true);

        // Distinct scripts used by this user in this category
        const { data: usedInCategory } = await supabase
          .from('script_usage')
          .select('script_id, scripts!inner(category_id)')
          .eq('user_id', userId)
          .eq('scripts.category_id', category.id);

        const uniqueUsed = new Set(
          (usedInCategory ?? []).map((r) => r.script_id)
        ).size;

        return {
          category,
          used: uniqueUsed,
          total: totalInCategory ?? 0,
          progress: totalInCategory
            ? Math.round((uniqueUsed / totalInCategory) * 100)
            : 0,
        };
      })
    );

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
