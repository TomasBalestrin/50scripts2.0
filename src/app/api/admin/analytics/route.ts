import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

/**
 * GET /api/admin/analytics?days=30
 * Returns user activity analytics for the admin dashboard.
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

    // Run all queries in parallel
    const [activityRes, profilesRes, scriptUsageRes, aiLogsRes] = await Promise.all([
      // All activity events in the period
      supabase
        .from('user_activity')
        .select('user_id, event_type, page_path, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),

      // All profiles for cross-reference
      supabase
        .from('profiles')
        .select('id, email, full_name, plan, last_login_at, created_at, is_active'),

      // Script usage in the period
      supabase
        .from('script_usage')
        .select('user_id, script_id, tone_used, used_at, resulted_in_sale')
        .gte('used_at', since),

      // AI usage in the period
      supabase
        .from('ai_generation_logs')
        .select('user_id, type, created_at')
        .gte('created_at', since),
    ]);

    const activities = activityRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const scriptUsages = scriptUsageRes.data ?? [];
    const aiLogs = aiLogsRes.data ?? [];

    // ---- DAU/WAU/MAU from activity events ----
    const uniqueUsersToday = new Set<string>();
    const uniqueUsersWeek = new Set<string>();
    const uniqueUsersMonth = new Set<string>();

    for (const a of activities) {
      const ts = new Date(a.created_at);
      if (ts >= todayStart) uniqueUsersToday.add(a.user_id);
      if (a.created_at >= weekAgo) uniqueUsersWeek.add(a.user_id);
      if (a.created_at >= monthAgo) uniqueUsersMonth.add(a.user_id);
    }

    // Fallback: also count from profiles.last_login_at for users without activity tracking
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

    // ---- DAU trend (daily unique users over period) ----
    const dauByDay: Record<string, Set<string>> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      dauByDay[d.toISOString().split('T')[0]] = new Set();
    }

    for (const a of activities) {
      const day = a.created_at.split('T')[0];
      if (dauByDay[day]) dauByDay[day].add(a.user_id);
    }

    const dauTrend = Object.entries(dauByDay).map(([date, users]) => ({
      date,
      count: users.size,
    }));

    // ---- Daily logins ----
    const loginsByDay: Record<string, number> = {};
    for (const key of Object.keys(dauByDay)) loginsByDay[key] = 0;

    for (const a of activities) {
      if (a.event_type === 'login' || a.event_type === 'page_view') {
        const day = a.created_at.split('T')[0];
        // Count unique users per day as "logins"
        if (dauByDay[day]) {
          // Already counted in DAU, just count page_view as first-access
        }
      }
    }

    // Use DAU as proxy for daily logins (each unique user = 1 login)
    const loginsTrend = dauTrend.map((d) => ({ date: d.date, logins: d.count }));

    // ---- Most visited pages ----
    const pageCounts: Record<string, number> = {};
    for (const a of activities) {
      if (a.event_type === 'page_view' && a.page_path) {
        // Group similar paths (e.g., /scripts/123 → /scripts)
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

    // ---- Peak hours (activity by hour of day) ----
    const hourCounts = new Array(24).fill(0);
    for (const a of activities) {
      if (a.event_type === 'page_view') {
        const hour = new Date(a.created_at).getHours();
        hourCounts[hour]++;
      }
    }

    const peakHours = hourCounts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}h`,
      count,
    }));

    // ---- Feature usage breakdown ----
    const featureUsage = [
      { feature: 'Scripts', count: scriptUsages.length },
      { feature: 'IA Copilot', count: aiLogs.length },
      {
        feature: 'Leads/CRM',
        count: activities.filter((a) => a.page_path?.startsWith('/leads')).length,
      },
      {
        feature: 'Agenda',
        count: activities.filter((a) => a.page_path?.startsWith('/today') || a.page_path?.startsWith('/agenda')).length,
      },
      {
        feature: 'Gamificação',
        count: activities.filter((a) => a.page_path?.startsWith('/challenges') || a.page_path?.startsWith('/ranking')).length,
      },
    ].filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

    // ---- Average session duration ----
    // Group activity by user+day, compute time between first and last event
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
      .map((s) => (s.last - s.first) / 1000 / 60) // minutes
      .filter((d) => d > 0); // exclude single-event sessions

    const avgSessionMinutes = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0;

    // ---- User engagement tiers ----
    const userEventCounts: Record<string, number> = {};
    for (const a of activities) {
      if (a.created_at >= monthAgo) {
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

    // ---- Top active users ----
    const userActivityCounts = Object.entries(userEventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const topUsers = userActivityCounts.map(([userId, eventCount]) => {
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
