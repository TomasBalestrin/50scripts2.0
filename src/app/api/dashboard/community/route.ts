import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

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

    // 2. Check plan >= pro
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const userPlan = (profile?.plan as Plan) ?? 'starter';

    if (!hasAccess(userPlan, 'pro')) {
      return NextResponse.json(
        {
          error: 'Pro plan or higher required for community metrics',
          required_plan: 'pro',
          current_plan: userPlan,
        },
        { status: 403 }
      );
    }

    // 3. Get top 10 scripts by global_conversion_rate with category info
    const { data: topScripts } = await supabase
      .from('scripts')
      .select(`
        id,
        title,
        global_effectiveness,
        global_conversion_rate,
        global_usage_count,
        category:script_categories(id, name, slug, icon, color)
      `)
      .eq('is_active', true)
      .gt('global_usage_count', 0)
      .order('global_conversion_rate', { ascending: false })
      .limit(10);

    // 4. Get average conversion rate across all scripts with usage
    const { data: allScriptsStats } = await supabase
      .from('scripts')
      .select('global_conversion_rate, global_usage_count')
      .eq('is_active', true)
      .gt('global_usage_count', 0);

    let avgConversionRate = 0;
    if (allScriptsStats && allScriptsStats.length > 0) {
      const totalWeightedRate = allScriptsStats.reduce(
        (sum, s) => sum + s.global_conversion_rate * s.global_usage_count,
        0
      );
      const totalUsage = allScriptsStats.reduce(
        (sum, s) => sum + s.global_usage_count,
        0
      );
      avgConversionRate = totalUsage > 0
        ? parseFloat((totalWeightedRate / totalUsage).toFixed(1))
        : 0;
    }

    // 5. Generate insights based on data
    const insights: string[] = [];

    // Calculate per-category conversion rates
    const categoryStats: Record<string, { name: string; totalRate: number; totalUsage: number }> = {};
    if (topScripts) {
      for (const script of topScripts) {
        const cat = script.category as unknown as Record<string, unknown>;
        const catArray = Array.isArray(cat) ? cat[0] : cat;
        if (catArray) {
          const slug = catArray.slug as string;
          const name = catArray.name as string;
          if (!categoryStats[slug]) {
            categoryStats[slug] = { name, totalRate: 0, totalUsage: 0 };
          }
          categoryStats[slug].totalRate += script.global_conversion_rate * script.global_usage_count;
          categoryStats[slug].totalUsage += script.global_usage_count;
        }
      }
    }

    // Find best performing category
    let bestCategory = { name: '', rate: 0 };
    for (const [, stats] of Object.entries(categoryStats)) {
      const rate = stats.totalUsage > 0 ? stats.totalRate / stats.totalUsage : 0;
      if (rate > bestCategory.rate) {
        bestCategory = { name: stats.name, rate };
      }
    }

    if (bestCategory.name && avgConversionRate > 0) {
      const diff = ((bestCategory.rate - avgConversionRate) / avgConversionRate * 100).toFixed(0);
      if (parseFloat(diff) > 0) {
        insights.push(
          `Scripts de ${bestCategory.name} convertem ${diff}% mais que a media`
        );
      }
    }

    // Top script insight
    if (topScripts && topScripts.length > 0) {
      const top = topScripts[0];
      insights.push(
        `"${top.title}" e o script com maior taxa de conversao (${top.global_conversion_rate.toFixed(1)}%)`
      );
    }

    // Usage insight
    if (allScriptsStats && allScriptsStats.length > 0) {
      const totalUsage = allScriptsStats.reduce((sum, s) => sum + s.global_usage_count, 0);
      insights.push(
        `A comunidade ja utilizou scripts ${totalUsage.toLocaleString('pt-BR')} vezes`
      );
    }

    // Average conversion insight
    if (avgConversionRate > 0) {
      insights.push(
        `Taxa media de conversao da comunidade: ${avgConversionRate}%`
      );
    }

    return NextResponse.json({
      top_scripts: topScripts ?? [],
      insights,
      avg_conversion_rate: avgConversionRate,
    });
  } catch (error) {
    console.error('[dashboard/community] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
