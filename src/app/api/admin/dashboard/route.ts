import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

const PLAN_PRICES: Record<string, number> = {
  starter: 29.9,
  pro: 19.9,
  premium: 49.9,
  copilot: 97.9,
};

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    // ---- Total users by plan ----
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('plan, is_active, created_at, last_login_at');

    const totalUsersByPlan: Record<string, number> = {
      starter: 0,
      pro: 0,
      premium: 0,
      copilot: 0,
    };
    let activeCount = 0;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let dauCount = 0;
    let mauCount = 0;

    // Monthly growth map (last 12 months)
    const monthlyGrowth: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGrowth[key] = 0;
    }

    for (const p of allProfiles ?? []) {
      const plan = p.plan as string;
      if (plan in totalUsersByPlan) {
        totalUsersByPlan[plan]++;
      }
      if (p.is_active) activeCount++;

      if (p.last_login_at) {
        const loginDate = new Date(p.last_login_at);
        if (loginDate >= oneDayAgo) dauCount++;
        if (loginDate >= thirtyDaysAgo) mauCount++;
      }

      if (p.created_at) {
        const createdDate = new Date(p.created_at);
        const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthlyGrowth) {
          monthlyGrowth[key]++;
        }
      }
    }

    const totalUsers = (allProfiles ?? []).length;

    // ---- MRR ----
    const mrr =
      totalUsersByPlan.starter * PLAN_PRICES.starter +
      totalUsersByPlan.pro * PLAN_PRICES.pro +
      totalUsersByPlan.premium * PLAN_PRICES.premium +
      totalUsersByPlan.copilot * PLAN_PRICES.copilot;

    // ---- Churn % ----
    const churnPercent = totalUsers > 0 ? ((totalUsers - activeCount) / totalUsers) * 100 : 0;

    // ---- DAU/MAU ----
    const dauMauRatio = mauCount > 0 ? (dauCount / mauCount) * 100 : 0;

    // ---- User growth (last 30 days) ----
    const growthMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      growthMap[key] = 0;
    }
    for (const p of allProfiles ?? []) {
      if (p.created_at) {
        const key = p.created_at.split('T')[0];
        if (key in growthMap) {
          growthMap[key]++;
        }
      }
    }
    const userGrowth = Object.entries(growthMap).map(([date, count]) => ({
      date,
      count,
    }));

    // ---- Users by plan chart ----
    const usersByPlanChart = Object.entries(totalUsersByPlan).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count,
    }));

    // ---- MRR trend (last 6 months) ----
    const mrrTrend: { date: string; mrr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const { data: monthProfiles } = await supabase
        .from('profiles')
        .select('plan')
        .lte('created_at', monthEnd.toISOString());

      let monthMrr = 0;
      for (const p of monthProfiles ?? []) {
        const plan = p.plan as string;
        if (plan in PLAN_PRICES) {
          monthMrr += PLAN_PRICES[plan];
        }
      }
      mrrTrend.push({
        date: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        mrr: Math.round(monthMrr * 100) / 100,
      });
    }

    // ---- Top scripts ----
    const { data: topScriptsRaw } = await supabase
      .from('scripts')
      .select(`
        id,
        title,
        category_id,
        global_usage_count,
        global_effectiveness,
        script_categories ( name )
      `)
      .order('global_usage_count', { ascending: false })
      .limit(10);

    const topScripts = (topScriptsRaw ?? []).map((s) => {
      const cats = s.script_categories as unknown;
      const category =
        Array.isArray(cats) && cats.length > 0
          ? (cats[0] as { name: string }).name
          : cats && typeof cats === 'object' && 'name' in cats
            ? (cats as { name: string }).name
            : null;
      return {
        id: s.id,
        title: s.title,
        category,
        usage_count: s.global_usage_count,
        avg_effectiveness: s.global_effectiveness,
      };
    });

    // ---- AI consumption ----
    const { data: aiLogs } = await supabase
      .from('ai_generation_logs')
      .select('tokens_used');

    const totalGenerations = aiLogs?.length ?? 0;
    const totalTokens = (aiLogs ?? []).reduce(
      (sum, l) => sum + (l.tokens_used ?? 0),
      0
    );
    const estimatedCost =
      Math.round((totalTokens / 1000) * 0.003 * 100) / 100;

    const aiConsumption = {
      total_generations: totalGenerations,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
    };

    // ---- Recent webhooks ----
    const { data: recentWebhooks } = await supabase
      .from('webhook_logs')
      .select('id, source, event_type, email_extracted, error_message, processed_at')
      .order('processed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      total_users: totalUsers,
      total_users_by_plan: totalUsersByPlan,
      active_count: activeCount,
      mrr: Math.round(mrr * 100) / 100,
      churn_percent: Math.round(churnPercent * 10) / 10,
      dau: dauCount,
      mau: mauCount,
      dau_mau_ratio: Math.round(dauMauRatio * 10) / 10,
      user_growth: userGrowth,
      users_by_plan_chart: usersByPlanChart,
      mrr_trend: mrrTrend,
      top_scripts: topScripts,
      ai_consumption: aiConsumption,
      recent_webhooks: (recentWebhooks ?? []).map((w) => ({
        id: w.id,
        source: w.source,
        event_type: w.event_type,
        email: w.email_extracted,
        status: w.error_message ? 'error' : 'success',
        error_message: w.error_message,
        processed_at: w.processed_at,
      })),
    });
  } catch (err) {
    console.error('[admin/dashboard] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
