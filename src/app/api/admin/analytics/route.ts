import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/analytics?days=30
 * Returns usability-focused analytics:
 * - User engagement: DAU/WAU/MAU, new signups, onboarding completion
 * - Feature usage: Scripts, Personalizados, Vendas, Busca
 * - Behavior: peak hours, top pages, session duration
 * - Top users by activity (last seen, events)
 * - Recent active users with timestamps
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { error } = await getAdminUser();
    if (error) return error;

    // Use admin client to bypass RLS for all analytics queries
    const supabase = await createAdminClient();

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run ALL queries in parallel
    const [
      activityRes,
      profilesRes,
      scriptUsageRes,
      personalizedRes,
      salesRes,
      onboardingRes,
    ] = await Promise.all([
      supabase
        .from('user_activity')
        .select('user_id, event_type, page_path, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),

      supabase
        .from('profiles')
        .select('id, email, full_name, last_login_at, last_active_date, created_at, is_active, onboarding_completed, new_level, active_days'),

      supabase
        .from('script_usage')
        .select('user_id, script_id, used_at')
        .gte('used_at', since),

      supabase
        .from('personalized_scripts')
        .select('user_id, created_at')
        .gte('created_at', since),

      supabase
        .from('script_sales')
        .select('user_id, sale_value, sale_date, created_at')
        .gte('created_at', since),

      supabase
        .from('user_onboarding')
        .select('user_id, created_at'),
    ]);

    const activities = activityRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const scriptUsages = scriptUsageRes.data ?? [];
    const personalized = personalizedRes.data ?? [];
    const sales = salesRes.data ?? [];
    const onboardings = onboardingRes.data ?? [];

    // ---- Build unified activity timeline from ALL sources ----
    type ActivityEntry = { user_id: string; timestamp: string; source: string };
    const allActivity: ActivityEntry[] = [];

    for (const a of activities) {
      allActivity.push({ user_id: a.user_id, timestamp: a.created_at, source: 'page_view' });
    }
    for (const s of scriptUsages) {
      allActivity.push({ user_id: s.user_id, timestamp: s.used_at, source: 'script' });
    }
    for (const p of personalized) {
      allActivity.push({ user_id: p.user_id, timestamp: p.created_at, source: 'personalized' });
    }
    for (const s of sales) {
      allActivity.push({ user_id: s.user_id, timestamp: s.created_at, source: 'sale' });
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

    // Also count from profiles.last_login_at and last_active_date
    const todayStr = todayStart.toISOString().split('T')[0];
    for (const p of profiles) {
      if (p.last_login_at) {
        const loginDate = new Date(p.last_login_at);
        if (loginDate >= todayStart) uniqueUsersToday.add(p.id);
        if (p.last_login_at >= weekAgo) uniqueUsersWeek.add(p.id);
        if (p.last_login_at >= monthAgo) uniqueUsersMonth.add(p.id);
      }
      if (p.last_active_date === todayStr) {
        uniqueUsersToday.add(p.id);
      }
    }

    const dau = uniqueUsersToday.size;
    const wau = uniqueUsersWeek.size;
    const mau = uniqueUsersMonth.size;

    // ---- New signups in period ----
    const newSignups = profiles.filter((p) => p.created_at >= since).length;

    // ---- Onboarding completion stats ----
    // Compare against users who actually logged in (have last_login_at), not all 938
    const usersWhoLoggedIn = profiles.filter((p) => p.last_login_at).length;
    const onboardingCompleted = onboardings.length;
    const onboardingRate = usersWhoLoggedIn > 0
      ? Math.round((onboardingCompleted / usersWhoLoggedIn) * 100)
      : 0;

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

    // ---- Most visited pages (from user_activity) ----
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
    const hourCountsByDay: Record<string, number[]> = {};
    for (const a of allActivity) {
      try {
        const d = new Date(a.timestamp);
        const hour = d.getHours();
        if (!isNaN(hour)) {
          hourCounts[hour]++;
          const day = a.timestamp.split('T')[0];
          if (!hourCountsByDay[day]) hourCountsByDay[day] = new Array(24).fill(0);
          hourCountsByDay[day][hour]++;
        }
      } catch {
        // skip invalid timestamps
      }
    }

    const peakHours = hourCounts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}h`,
      count,
    }));

    // Peak hours per day for day filter
    const peakHoursByDay: Record<string, { hour: string; count: number }[]> = {};
    for (const [day, counts] of Object.entries(hourCountsByDay)) {
      peakHoursByDay[day] = counts.map((count, hour) => ({
        hour: `${String(hour).padStart(2, '0')}h`,
        count,
      }));
    }

    // ---- Feature/Module usage breakdown ----
    // Count page views by module from user_activity
    let gestaoViews = 0;
    let scriptsViews = 0;
    let personalizadosViews = 0;
    let buscaViews = 0;

    for (const a of activities) {
      if (a.event_type === 'page_view' && a.page_path) {
        const p = a.page_path;
        if (p === '/' || p === '/dashboard') gestaoViews++;
        else if (p.startsWith('/trilhas') || p.startsWith('/scripts')) scriptsViews++;
        else if (p.startsWith('/personalizados')) personalizadosViews++;
        else if (p.startsWith('/busca')) buscaViews++;
      }
    }

    // Add actual usage data from tables
    const featureUsage = [
      { feature: 'Gestão', count: gestaoViews },
      { feature: 'Scripts', count: scriptsViews + scriptUsages.length },
      { feature: 'Personalizados', count: personalizadosViews + personalized.length },
      { feature: 'Buscar', count: buscaViews },
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

    // Calculate session duration: if only 1 event, count as 1 min (user was there)
    const sessionDurations = Object.values(userDaySessions)
      .map((s) => {
        const mins = (s.last - s.first) / 1000 / 60;
        return mins > 0 ? mins : 1; // At least 1 min per session
      });

    const avgSessionMinutes = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0;

    // ---- User engagement tiers (from ALL sources in last 30d) ----
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

    // ---- Top active users (from ALL sources) with last seen ----
    const userLastSeen: Record<string, string> = {};
    for (const a of allActivity) {
      if (!userLastSeen[a.user_id] || a.timestamp > userLastSeen[a.user_id]) {
        userLastSeen[a.user_id] = a.timestamp;
      }
    }
    // Also check profiles.last_login_at
    for (const p of profiles) {
      if (p.last_login_at) {
        if (!userLastSeen[p.id] || p.last_login_at > userLastSeen[p.id]) {
          userLastSeen[p.id] = p.last_login_at;
        }
      }
    }

    const topUserEntries = Object.entries(userEventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const topUsers = topUserEntries.map(([userId, eventCount]) => {
      const p = profileMap.get(userId);
      return {
        id: userId,
        name: p?.full_name || p?.email || 'Desconhecido',
        email: p?.email || '',
        level: p?.new_level || 'iniciante',
        active_days: p?.active_days || 0,
        events: eventCount,
        last_seen: userLastSeen[userId] || '',
      };
    });

    // ---- Recent active users (last 20 unique) ----
    const recentSeen: { user_id: string; timestamp: string; source: string }[] = [];
    const seenUsers = new Set<string>();
    // Sort all activity by timestamp desc
    const sortedActivity = [...allActivity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    for (const a of sortedActivity) {
      if (!seenUsers.has(a.user_id)) {
        seenUsers.add(a.user_id);
        recentSeen.push(a);
        if (recentSeen.length >= 20) break;
      }
    }

    const recentUsers = recentSeen.map((r) => {
      const p = profileMap.get(r.user_id);
      return {
        id: r.user_id,
        name: p?.full_name || p?.email || 'Desconhecido',
        email: p?.email || '',
        last_seen: r.timestamp,
        last_action: getActionLabel(r.source),
      };
    });

    // ---- Sales stats ----
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.sale_value || 0), 0);

    // ---- Level distribution ----
    const levelCounts: Record<string, number> = {};
    for (const p of profiles) {
      const lvl = p.new_level || 'iniciante';
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    }
    const levelDistribution = Object.entries(levelCounts)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => {
        const order = ['iniciante', 'aprendiz', 'executor', 'estrategista', 'especialista', 'referencia', 'lenda'];
        return order.indexOf(a.level) - order.indexOf(b.level);
      });

    const response = NextResponse.json({
      // Core metrics
      dau,
      wau,
      mau,
      total_users: profiles.length,
      active_users: profiles.filter((p) => p.is_active).length,
      new_signups: newSignups,
      avg_session_minutes: avgSessionMinutes,

      // Onboarding
      onboarding_completed: onboardingCompleted,
      onboarding_rate: onboardingRate,
      users_who_logged_in: usersWhoLoggedIn,

      // Feature usage stats
      scripts_used: scriptUsages.length,
      personalized_generated: personalized.length,
      total_sales: totalSales,
      total_revenue: totalRevenue,

      // Charts
      dau_trend: dauTrend,
      top_pages: topPages,
      peak_hours: peakHours,
      peak_hours_by_day: peakHoursByDay,
      feature_usage: featureUsage,
      engagement: {
        high: highEngagement,
        medium: mediumEngagement,
        low: lowEngagement,
      },
      level_distribution: levelDistribution,

      // Tables
      top_users: topUsers,
      recent_users: recentUsers,
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
    '/': 'Gestão (Home)',
    '/dashboard': 'Gestão',
    '/trilhas': 'Scripts / Trilhas',
    '/scripts': 'Script Detalhe',
    '/personalizados': 'Personalizados',
    '/busca': 'Buscar',
    '/onboarding': 'Onboarding',
    '/admin': 'Admin',
    '/login': 'Login',
  };
  return labels[path] || path;
}

function getActionLabel(source: string): string {
  const labels: Record<string, string> = {
    page_view: 'Navegação',
    script: 'Usou Script',
    personalized: 'Gerou Personalizado',
    sale: 'Registrou Venda',
  };
  return labels[source] || source;
}
