import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  pro: 19.9,
  premium: 39.9,
  copilot: 99.9,
};

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    // Run ALL independent queries in parallel (was sequential before)
    const [profilesRes, topScriptsRes, aiLogsRes, webhooksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('plan, is_active, created_at, last_login_at'),
      supabase
        .from('scripts')
        .select(`
          id, title, category_id, global_usage_count, global_effectiveness,
          script_categories ( name )
        `)
        .order('global_usage_count', { ascending: false })
        .limit(10),
      supabase
        .from('ai_generation_logs')
        .select('tokens_used'),
      supabase
        .from('webhook_logs')
        .select('id, source, event_type, email_extracted, status, error_message, processed_at')
        .order('processed_at', { ascending: false })
        .limit(10),
    ]);

    const allProfiles = profilesRes.data ?? [];

    // ---- Compute everything from profiles in memory (zero extra DB calls) ----
    const totalUsersByPlan: Record<string, number> = {
      starter: 0, pro: 0, premium: 0, copilot: 0,
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

    for (const p of allProfiles) {
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

    const totalUsers = allProfiles.length;

    // ---- MRR ----
    const mrrByPlan: Record<string, number> = {
      starter: Math.round(totalUsersByPlan.starter * PLAN_PRICES.starter * 100) / 100,
      pro: Math.round(totalUsersByPlan.pro * PLAN_PRICES.pro * 100) / 100,
      premium: Math.round(totalUsersByPlan.premium * PLAN_PRICES.premium * 100) / 100,
      copilot: Math.round(totalUsersByPlan.copilot * PLAN_PRICES.copilot * 100) / 100,
    };
    const mrr = mrrByPlan.starter + mrrByPlan.pro + mrrByPlan.premium + mrrByPlan.copilot;

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
    for (const p of allProfiles) {
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

    // ---- MRR trend (last 6 months) - computed from existing data, NO extra queries ----
    const mrrTrend: { date: string; mrr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      // Count users by plan that existed by this month's end
      let monthMrr = 0;
      for (const p of allProfiles) {
        if (p.created_at && new Date(p.created_at) <= monthEnd) {
          const plan = p.plan as string;
          if (plan in PLAN_PRICES) {
            monthMrr += PLAN_PRICES[plan];
          }
        }
      }
      mrrTrend.push({
        date: monthKey,
        mrr: Math.round(monthMrr * 100) / 100,
      });
    }

    // ---- Top scripts (from parallel query) ----
    const topScripts = (topScriptsRes.data ?? []).map((s) => {
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

    // ---- AI consumption (from parallel query) ----
    const aiLogs = aiLogsRes.data ?? [];
    const totalGenerations = aiLogs.length;
    const totalTokens = aiLogs.reduce(
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

    // ---- Recent webhooks (from parallel query) ----
    const recentWebhooks = webhooksRes.data ?? [];

    const response = NextResponse.json({
      total_users: totalUsers,
      total_users_by_plan: totalUsersByPlan,
      active_count: activeCount,
      mrr: Math.round(mrr * 100) / 100,
      mrr_by_plan: mrrByPlan,
      churn_percent: Math.round(churnPercent * 10) / 10,
      dau: dauCount,
      mau: mauCount,
      dau_mau_ratio: Math.round(dauMauRatio * 10) / 10,
      user_growth: userGrowth,
      users_by_plan_chart: usersByPlanChart,
      mrr_trend: mrrTrend,
      top_scripts: topScripts,
      ai_consumption: aiConsumption,
      recent_webhooks: recentWebhooks.map((w) => ({
        id: w.id,
        source: w.source,
        event_type: w.event_type,
        email: w.email_extracted,
        status: (w as Record<string, unknown>).status as string || (w.error_message ? 'error' : 'success'),
        error_message: w.error_message,
        processed_at: w.processed_at,
      })),
    });

    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('[admin/dashboard] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
