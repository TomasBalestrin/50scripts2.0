'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  Lock,
  Flame,
  Zap,
  Award,
  Calendar,
  Users,
  Lightbulb,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Script, ScriptCategory, MicrolearningTip } from '@/types/database';
import { PLAN_HIERARCHY, LEVEL_LABELS } from '@/lib/constants';
import { TipCard } from '@/components/dashboard/tip-card';
import { TrailProgress } from '@/components/dashboard/trail-progress';
import { StarRating } from '@/components/scripts/star-rating';
import { RevenueCard } from '@/components/dashboard/revenue-card';
import type { Level } from '@/types/database';

// Lazy-load heavy recharts components - only downloaded for Pro+ users
const RevenueChart = dynamic(() => import('@/components/dashboard/revenue-chart').then(m => ({ default: m.RevenueChart })), {
  loading: () => <SkeletonChart />,
});
const RevenueByTrail = dynamic(() => import('@/components/dashboard/revenue-by-trail').then(m => ({ default: m.RevenueByTrail })), {
  loading: () => <SkeletonChart />,
});
const RevenueByScript = dynamic(() => import('@/components/dashboard/revenue-by-script').then(m => ({ default: m.RevenueByScript })), {
  loading: () => <SkeletonChart />,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  profile: {
    full_name: string;
    plan: string;
  };
  stats: {
    scripts_used: number;
    total_scripts: number;
    sales_count: number;
    total_sales_value: number;
  };
  trails: {
    name: string;
    icon: string;
    slug: string;
    used: number;
    total: number;
    color: string;
  }[];
  tip?: MicrolearningTip;
  recommendations?: { scripts: RecommendedScript[] };
}

interface RecommendedScript extends Script {
  category?: ScriptCategory;
}

interface RevenueData {
  total_revenue: number;
  total_sales: number;
  revenue_by_trail: Array<{ name: string; slug: string; total: number; count: number }>;
  revenue_by_script: Array<{ title: string; total: number; count: number }>;
  weekly_revenue: Array<{ week_start: string; total: number; sales_count: number }>;
}

interface GamificationData {
  xp_points: number;
  level: Level;
  current_streak: number;
  longest_streak: number;
}

interface ChallengeData {
  challenge: {
    id: string;
    challenge_type: string;
    target_count: number;
    current_count: number;
    completed: boolean;
    xp_reward: number;
  } | null;
}

interface AgendaBlock {
  block: string;
  label: string;
  action: string;
  item: {
    id: string;
    completed: boolean;
    suggested_script: { id: string; title: string } | null;
  } | null;
}

interface AgendaData {
  date: string;
  blocks: AgendaBlock[];
}

interface CommunityData {
  top_scripts: Array<{
    id: string;
    title: string;
    global_effectiveness: number;
    global_conversion_rate: number;
    global_usage_count: number;
  }>;
  insights: string[];
  avg_conversion_rate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Trail colors for revenue-by-trail chart
const TRAIL_COLORS: Record<string, string> = {
  'abordagem-inicial': '#3B82F6',
  'ativacao-base': '#6366F1',
  'qualificacao': '#1D4ED8',
  'apresentacao-oferta': '#10B981',
  'follow-up': '#3B82C4',
  'contorno-objecao': '#E87040',
  'fechamento': '#06B6D4',
  'pos-venda': '#D4A843',
};

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[#0A0F1E] p-5 ${className}`}>
      <div className="mb-3 h-4 w-3/4 rounded bg-[#131B35]" />
      <div className="mb-2 h-3 w-full rounded bg-[#131B35]" />
      <div className="h-3 w-2/3 rounded bg-[#131B35]" />
    </div>
  );
}

function SkeletonTip() {
  return (
    <div className="animate-pulse rounded-xl bg-gradient-to-r from-[#1D4ED8]/20 to-[#3B82F6]/20 p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-[#131B35]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/4 rounded bg-[#131B35]" />
          <div className="h-3 w-full rounded bg-[#131B35]" />
          <div className="h-3 w-3/4 rounded bg-[#131B35]" />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <div className="mb-4 h-4 w-32 rounded bg-[#131B35]" />
      <div className="h-64 w-full rounded bg-[#131B35]/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();

  // SWR: fetch basic dashboard data (combined endpoint with fallback)
  const { data: dashboardData, error: dashboardError, isLoading: loading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/dashboard/all',
    async (url: string) => {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return {
          profile: data.profile,
          stats: data.stats,
          trails: data.trails,
          tip: data.tip,
          recommendations: data.recommendations,
        };
      }
      // Fallback: fetch from individual endpoints
      const [dashRes, tipRes, recRes] = await Promise.allSettled([
        fetch('/api/dashboard/basic'),
        fetch('/api/tips/daily'),
        fetch('/api/scripts/recommendations'),
      ]);

      const result: DashboardData = {
        profile: { full_name: '', plan: 'starter' },
        stats: { scripts_used: 0, total_scripts: 0, sales_count: 0, total_sales_value: 0 },
        trails: [],
      };

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const d = await dashRes.value.json();
        Object.assign(result, d);
      }
      if (tipRes.status === 'fulfilled' && tipRes.value.ok) {
        result.tip = await tipRes.value.json();
      }
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const d = await recRes.value.json();
        result.recommendations = { scripts: Array.isArray(d) ? d : d.scripts ?? [] };
      }
      return result;
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  // Determine plan level
  const userPlan = dashboardData?.profile?.plan || 'starter';
  const isPro = PLAN_HIERARCHY[userPlan as keyof typeof PLAN_HIERARCHY] >= PLAN_HIERARCHY.pro;

  // SWR: fetch Pro+ data (conditionally)
  const { data: revenueData, isLoading: revLoading } = useSWR<RevenueData>(
    isPro ? '/api/dashboard/revenue' : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: gamificationData } = useSWR<GamificationData>(
    isPro ? '/api/gamification/status' : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: challengeData } = useSWR<ChallengeData>(
    isPro ? '/api/gamification/challenge' : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: agendaData } = useSWR<AgendaData>(
    isPro ? '/api/agenda/today' : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const { data: communityData } = useSWR<CommunityData>(
    isPro ? '/api/dashboard/community' : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const proDataLoading = isPro && revLoading;

  const tip = dashboardData?.tip || null;
  const recommendations: RecommendedScript[] = dashboardData?.recommendations?.scripts ?? [];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-[#0A0F1E]" />
            <div className="h-4 w-40 rounded bg-[#0A0F1E]" />
          </div>
          <SkeletonTip />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonChart />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-red-400">Erro ao carregar o painel</p>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Tente recarregar a pagina ou volte em alguns instantes.
            </p>
            <button
              onClick={() => mutateDashboard()}
              className="mt-4 rounded-lg bg-[#1D4ED8] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]/90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userName = dashboardData?.profile?.full_name?.split(' ')[0] || 'Vendedor';
  const greeting = getGreeting();
  const isStarter = !isPro;
  const suggestedTrail = dashboardData?.trails?.find((t) => t.used < t.total);

  // Prepare chart data
  const weeklyChartData = revenueData?.weekly_revenue
    ? [...revenueData.weekly_revenue].reverse().map((w, i) => ({
        week: `Sem ${i + 1}`,
        revenue: w.total,
      }))
    : [];

  const trailChartData = revenueData?.revenue_by_trail
    ? revenueData.revenue_by_trail.map((t) => ({
        name: t.name,
        revenue: t.total,
        color: TRAIL_COLORS[t.slug] || '#1D4ED8',
      }))
    : [];

  const scriptTableData = revenueData?.revenue_by_script
    ? revenueData.revenue_by_script.map((s) => ({
        title: s.title,
        usageCount: s.count,
        revenue: s.total,
        conversionRate: s.count > 0 ? (s.count / (revenueData.total_sales || 1)) * 100 : 0,
      }))
    : [];

  // Calculate previous revenue (sum of weeks 2-4 averaged, vs week 1)
  const currentWeekRevenue = revenueData?.weekly_revenue?.[0]?.total ?? 0;
  const previousWeekRevenue = revenueData?.weekly_revenue?.[1]?.total ?? 0;

  // Agenda: next 2 incomplete items
  const nextAgendaItems = agendaData?.blocks
    ?.filter((b) => b.item && !b.item.completed)
    ?.slice(0, 2) ?? [];

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-6xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Greeting */}
        {/* ------------------------------------------------------------------ */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {greeting}, {userName}!
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Aqui esta seu painel de vendas
          </p>
        </motion.div>

        {/* ------------------------------------------------------------------ */}
        {/* Microlearning Tip */}
        {/* ------------------------------------------------------------------ */}
        {tip && (
          <motion.div variants={itemVariants}>
            <TipCard tip={{ content: tip.content, category: tip.category ?? undefined }} />
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PRO+: Streak / XP / Level row */}
        {/* ------------------------------------------------------------------ */}
        {isPro && gamificationData && (
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Streak */}
              <div className="flex items-center gap-3 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/15">
                  <Flame className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{gamificationData.current_streak}</p>
                  <p className="text-xs text-[#94A3B8]">Dias seguidos</p>
                </div>
              </div>

              {/* XP */}
              <div className="flex items-center gap-3 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/15">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {gamificationData.xp_points.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Pontos XP</p>
                </div>
              </div>

              {/* Level */}
              <div className="flex items-center gap-3 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15">
                  <Award className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {LEVEL_LABELS[gamificationData.level] || gamificationData.level}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Nivel atual</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PRO+: Revenue Card + Challenge + Agenda Preview */}
        {/* ------------------------------------------------------------------ */}
        {isPro && (
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Revenue Card */}
              {proDataLoading ? (
                <SkeletonCard className="h-36" />
              ) : revenueData ? (
                <RevenueCard
                  totalRevenue={revenueData.total_revenue}
                  previousRevenue={previousWeekRevenue > 0 ? revenueData.total_revenue - currentWeekRevenue + previousWeekRevenue : revenueData.total_revenue * 0.85}
                />
              ) : (
                <RevenueCard totalRevenue={0} previousRevenue={0} />
              )}

              {/* Challenge Card */}
              {proDataLoading ? (
                <SkeletonCard className="h-36" />
              ) : challengeData?.challenge ? (
                <div className="relative overflow-hidden rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8]" />
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#1D4ED8]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                      Desafio do dia
                    </span>
                  </div>
                  <p className="mb-3 text-sm font-medium text-white">
                    {challengeData.challenge.completed
                      ? 'Desafio concluido!'
                      : `Meta: ${challengeData.challenge.target_count} acoes`}
                  </p>
                  {/* Progress bar */}
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-[#131B35]">
                    <div
                      className="h-full rounded-full bg-[#1D4ED8] transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (challengeData.challenge.current_count / challengeData.challenge.target_count) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>
                      {challengeData.challenge.current_count}/{challengeData.challenge.target_count}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Zap className="h-3 w-3" />+{challengeData.challenge.xp_reward} XP
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Agenda Preview */}
              {proDataLoading ? (
                <SkeletonCard className="h-36" />
              ) : nextAgendaItems.length > 0 ? (
                <div
                  className="cursor-pointer rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 transition-colors hover:border-[#3B82F6]"
                  onClick={() => router.push('/agenda')}
                  role="button"
                  tabIndex={0}
                  aria-label="Ver agenda de hoje"
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push('/agenda'); }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#1D4ED8]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        Agenda de hoje
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                  </div>
                  <div className="space-y-2">
                    {nextAgendaItems.map((block) => (
                      <div
                        key={block.block}
                        className="flex items-center gap-2 rounded-lg bg-[#131B35]/50 px-3 py-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">{block.label}</p>
                          {block.item?.suggested_script && (
                            <p className="truncate text-[10px] text-[#94A3B8]">
                              {block.item.suggested_script.title}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PRO+: Revenue Charts (Weekly + By Trail) */}
        {/* ------------------------------------------------------------------ */}
        {isPro && (
          <motion.div variants={itemVariants}>
            {proDataLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SkeletonChart />
                <SkeletonChart />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {weeklyChartData.length > 0 && (
                  <RevenueChart data={weeklyChartData} />
                )}
                {trailChartData.length > 0 && (
                  <RevenueByTrail data={trailChartData} />
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PRO+: Top Scripts by Revenue */}
        {/* ------------------------------------------------------------------ */}
        {isPro && scriptTableData.length > 0 && (
          <motion.div variants={itemVariants}>
            <RevenueByScript scripts={scriptTableData} />
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PRO+: Community Insights */}
        {/* ------------------------------------------------------------------ */}
        {isPro && communityData && communityData.insights.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4 text-[#1D4ED8]" />
                Insights da Comunidade
              </h3>
              <div className="space-y-3">
                {communityData.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg bg-[#131B35]/40 px-4 py-3"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                    <p className="text-sm text-[#94A3B8]">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Suggested Trail (All plans) */}
        {/* ------------------------------------------------------------------ */}
        {suggestedTrail && (
          <motion.div variants={itemVariants}>
            <div
              className="flex cursor-pointer items-center justify-between rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 transition-colors hover:border-[#3B82F6]"
              onClick={() => router.push(`/trilhas/${suggestedTrail.slug}`)}
              role="button"
              tabIndex={0}
              aria-label={`Ir para trilha ${suggestedTrail.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/trilhas/${suggestedTrail.slug}`); }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{suggestedTrail.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[#1D4ED8]">Trilha sugerida para agora</p>
                  <p className="text-base font-semibold text-white">{suggestedTrail.name}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Most Used Scripts (All plans) */}
        {/* ------------------------------------------------------------------ */}
        {recommendations.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-[#1D4ED8]" />
              Scripts mais usados
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="grid" aria-label="Scripts mais usados">
              {recommendations.slice(0, 4).map((script) => (
                <motion.div
                  key={script.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`Script: ${script.title}`}
                  className="cursor-pointer rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4 transition-colors hover:border-[#1D4ED8]/30 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                  onClick={() => router.push(`/scripts/${script.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/scripts/${script.id}`); }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {script.category && (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: script.category.color + '33', color: script.category.color }}
                      >
                        {script.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-white line-clamp-2">{script.title}</h3>
                  <div className="mb-2">
                    <StarRating value={Math.round(script.global_effectiveness)} readonly size={12} />
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {script.global_usage_count} {script.global_usage_count === 1 ? 'uso' : 'usos'}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Trail Progress (All plans) */}
        {/* ------------------------------------------------------------------ */}
        {dashboardData?.trails && dashboardData.trails.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-[#1D4ED8]" />
                Progresso das Trilhas
              </h2>
              <TrailProgress trails={dashboardData.trails} />
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Upgrade CTA for Starter plan */}
        {/* ------------------------------------------------------------------ */}
        {isStarter && (
          <motion.div variants={itemVariants}>
            <div className="relative overflow-hidden rounded-xl border border-[#131B35] bg-[#0A0F1E] p-6">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1D4ED8]/5 to-[#3B82F6]/5" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#1D4ED8]" />
                  <h3 className="text-lg font-semibold text-white">Desbloqueie todo o potencial</h3>
                </div>

                {/* Blurred revenue preview */}
                <div className="mb-4 rounded-xl border border-[#131B35]/50 bg-[#020617]/50 p-5">
                  <p className="mb-1 text-xs text-[#94A3B8]">Receita Total</p>
                  <p className="mb-2 text-3xl font-bold text-white/20 blur-sm select-none">
                    R$ 12.450
                  </p>
                  <p className="text-sm text-[#94A3B8]">
                    Seus scripts geraram este valor
                  </p>
                  <div className="mt-3 flex gap-4">
                    <div className="h-16 flex-1 rounded-lg bg-[#131B35]/30 blur-sm" />
                    <div className="h-16 flex-1 rounded-lg bg-[#131B35]/30 blur-sm" />
                  </div>
                </div>

                <p className="mb-4 text-sm text-[#94A3B8]">
                  Faca upgrade para ver suas metricas completas, desafios diarios, agenda inteligente e insights da comunidade.
                </p>
                <button
                  onClick={() => router.push('/upgrade')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]/90"
                >
                  Faca upgrade Pro
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
