import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

/**
 * GET /api/admin/analytics?days=30
 * Returns user activity analytics using ALL available data sources:
 * - user_activity (page views, heartbeats - new tracking)
 * - script_usage (historical script interactions)
 * - ai_generation_logs (historical AI usage)
 * - daily_challenges (gamification engagement)
 * - profiles.last_login_at (login fallback)
 */
export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run ALL queries in parallel - use every data source available
    const [activityRes, profilesRes, scriptUsageRes, aiLogsRes, challengesRes, leadsRes] = await Promise.all([
      supabase
        .from('user_activity')
        .select('user_id, event_type, page_path, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),

      supabase
        .from('profiles')
        .select('id, email, full_name, plan, last_login_at, created_at, is_active'),

      supabase
        .from('script_usage')
        .select('user_id, script_id, tone_used, used_at, resulted_in_sale')
        .gte('used_at', since),

      supabase
        .from('ai_generation_logs')
        .select('user_id, type, created_at')
        .gte('created_at', since),

      supabase
        .from('daily_challenges')
        .select('user_id, completed, challenge_date')
        .gte('challenge_date', since.split('T')[0]),

      supabase
        .from('leads')
        .select('user_id, created_at')
        .gte('created_at', since),
    ]);

    const activities = activityRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const scriptUsages = scriptUsageRes.data ?? [];
    const aiLogs = aiLogsRes.data ?? [];
    const challenges = challengesRes.data ?? [];
    const leads = leadsRes.data ?? [];

    // ---- Build unified activity timeline from ALL sources ----
    // Each entry: { user_id, timestamp, source }
    type ActivityEntry = { user_id: string; timestamp: string; source: string };
    const allActivity: ActivityEntry[] = [];

    for (const a of activities) {
      allActivity.push({ user_id: a.user_id, timestamp: a.created_at, source: 'page_view' });
    }
    for (const s of scriptUsages) {
      allActivity.push({ user_id: s.user_id, timestamp: s.used_at, source: 'script' });
    }
    for (const a of aiLogs) {
      allActivity.push({ user_id: a.user_id, timestamp: a.created_at, source: 'ai' });
    }
    for (const c of challenges) {
      allActivity.push({ user_id: c.user_id, timestamp: c.challenge_date, source: 'challenge' });
    }
    for (const l of leads) {
      allActivity.push({ user_id: l.user_id, timestamp: l.created_at, source: 'lead' });
    }

    // ---- DAU/WAU/MAU from ALL sources ----
    const uniqueUsersToday = new Set<string>();
    const uniqueUsersWeek = new Set<string>();
    const uniqueUsersMonth = new Set<string>();

    for (const a of allActivity) {
      const ts = new Date(a.timestamp);
      if (ts >= todayStart) uniqueUsersToday.add(a.user_id);
      if (a.timestamp >= weekAgo) uniqueUsersWeek.add(a.user_id);
      if (a.timestamp >= monthAgo) uniqueUsersMonth.add(a.user_id);
    }

    // Also count from profiles.last_login_at
    for (const p of profiles) {
      if (p.last_login_at) {
        const loginDate = new Date(p.last_login_at);
        if (loginDate >= todayStart) uniqueUsersToday.add(p.id);
        if (p.last_login_at >= weekAgo) uniqueUsersWeek.add(p.id);
        if (p.last_login_at >= monthAgo) uniqueUsersMonth.add(p.id);
      }
    }

    const dau = uniqueUsersToday.size;
    const wau = uniqueUsersWeek.size;
    const mau = uniqueUsersMonth.size;

    // ---- DAU trend (daily unique users from ALL sources) ----
    const dauByDay: Record<string, Set<string>> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      dauByDay[d.toISOString().split('T')[0]] = new Set();
    }

    for (const a of allActivity) {
      const day = a.timestamp.split('T')[0];
      if (dauByDay[day]) dauByDay[day].add(a.user_id);
    }

    const dauTrend = Object.entries(dauByDay).map(([date, users]) => ({
      date,
      count: users.size,
    }));

    // ---- Daily logins (unique users with any activity per day) ----
    const loginsTrend = dauTrend.map((d) => ({ date: d.date, logins: d.count }));

    // ---- Most visited pages (from user_activity only) ----
    const pageCounts: Record<string, number> = {};
    for (const a of activities) {
      if (a.event_type === 'page_view' && a.page_path) {
        const basePath = a.page_path.split('/').slice(0, 3).join('/') || a.page_path;
        pageCounts[basePath] = (pageCounts[basePath] || 0) + 1;
      }
    }

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({
        path,
        label: getPageLabel(path),
        views,
      }));

    // ---- Peak hours (from ALL activity sources) ----
    const hourCounts = new Array(24).fill(0);
    for (const a of allActivity) {
      try {
        const hour = new Date(a.timestamp).getHours();
        if (!isNaN(hour)) hourCounts[hour]++;
      } catch {
        // skip invalid timestamps (e.g., date-only from daily_challenges)
      }
    }

    const peakHours = hourCounts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}h`,
      count,
    }));

    // ---- Feature usage breakdown (from real data) ----
    const featureUsage = [
      { feature: 'Scripts', count: scriptUsages.length },
      { feature: 'IA Copilot', count: aiLogs.length },
      { feature: 'Leads/CRM', count: leads.length },
      { feature: 'Desafios', count: challenges.length },
      {
        feature: 'Agenda',
        count: activities.filter((a) => a.page_path?.startsWith('/today') || a.page_path?.startsWith('/agenda')).length,
      },
    ].filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

    // ---- Average session duration (from user_activity heartbeats + page views) ----
    const userDaySessions: Record<string, { first: number; last: number }> = {};
    for (const a of activities) {
      const day = a.created_at.split('T')[0];
      const key = `${a.user_id}_${day}`;
      const ts = new Date(a.created_at).getTime();
      if (!userDaySessions[key]) {
        userDaySessions[key] = { first: ts, last: ts };
      } else {
        if (ts < userDaySessions[key].first) userDaySessions[key].first = ts;
        if (ts > userDaySessions[key].last) userDaySessions[key].last = ts;
      }
    }

    const sessionDurations = Object.values(userDaySessions)
      .map((s) => (s.last - s.first) / 1000 / 60)
      .filter((d) => d > 0);

    const avgSessionMinutes = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0;

    // ---- User engagement tiers (from ALL sources) ----
    const userEventCounts: Record<string, number> = {};
    for (const a of allActivity) {
      if (a.timestamp >= monthAgo) {
        userEventCounts[a.user_id] = (userEventCounts[a.user_id] || 0) + 1;
      }
    }

    let highEngagement = 0;
    let mediumEngagement = 0;
    let lowEngagement = 0;
    for (const count of Object.values(userEventCounts)) {
      if (count >= 50) highEngagement++;
      else if (count >= 10) mediumEngagement++;
      else lowEngagement++;
    }

    // ---- Top active users (from ALL sources) ----
    const topUserEntries = Object.entries(userEventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const topUsers = topUserEntries.map(([userId, eventCount]) => {
      const p = profileMap.get(userId);
      return {
        id: userId,
        name: p?.full_name || p?.email || 'Desconhecido',
        plan: p?.plan || 'starter',
        events: eventCount,
      };
    });

    // ---- Tone preference (from script_usage) ----
    const toneCounts: Record<string, number> = {};
    for (const s of scriptUsages) {
      const tone = s.tone_used || 'casual';
      toneCounts[tone] = (toneCounts[tone] || 0) + 1;
    }

    const tonePreference = Object.entries(toneCounts)
      .map(([tone, count]) => ({ tone, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Script conversion rate ----
    const totalScriptUses = scriptUsages.length;
    const salesFromScripts = scriptUsages.filter((s) => s.resulted_in_sale).length;
    const scriptConversionRate = totalScriptUses > 0
      ? Math.round((salesFromScripts / totalScriptUses) * 1000) / 10
      : 0;

    const response = NextResponse.json({
      dau,
      wau,
      mau,
      avg_session_minutes: avgSessionMinutes,
      total_users: profiles.length,
      active_users: profiles.filter((p) => p.is_active).length,
      dau_trend: dauTrend,
      logins_trend: loginsTrend,
      top_pages: topPages,
      peak_hours: peakHours,
      feature_usage: featureUsage,
      engagement: {
        high: highEngagement,
        medium: mediumEngagement,
        low: lowEngagement,
      },
      top_users: topUsers,
      tone_preference: tonePreference,
      script_stats: {
        total_uses: totalScriptUses,
        sales: salesFromScripts,
        conversion_rate: scriptConversionRate,
      },
    });

    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;
  } catch (err) {
    console.error('[admin/analytics] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getPageLabel(path: string): string {
  const labels: Record<string, string> = {
    '/': 'Home',
    '/scripts': 'Scripts',
    '/today': 'Hoje',
    '/agenda': 'Agenda',
    '/ai-copilot': 'IA Copilot',
    '/leads': 'Leads/CRM',
    '/challenges': 'Desafios',
    '/ranking': 'Ranking',
    '/profile': 'Perfil',
    '/settings': 'Configurações',
    '/emergency': 'Emergência',
    '/referral': 'Indicações',
  };
  return labels[path] || path;
}
