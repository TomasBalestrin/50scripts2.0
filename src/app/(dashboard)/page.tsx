'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Script, ScriptCategory, MicrolearningTip } from '@/types/database';
import { PLAN_HIERARCHY } from '@/lib/constants';
import { TipCard } from '@/components/dashboard/tip-card';
import { TrailProgress } from '@/components/dashboard/trail-progress';
import { StarRating } from '@/components/scripts/star-rating';

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
}

interface RecommendedScript extends Script {
  category?: ScriptCategory;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[#1A1A2E] p-5 ${className}`}>
      <div className="mb-3 h-4 w-3/4 rounded bg-[#252542]" />
      <div className="mb-2 h-3 w-full rounded bg-[#252542]" />
      <div className="h-3 w-2/3 rounded bg-[#252542]" />
    </div>
  );
}

function SkeletonTip() {
  return (
    <div className="animate-pulse rounded-xl bg-gradient-to-r from-[#E94560]/20 to-[#0F3460]/20 p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-[#252542]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/4 rounded bg-[#252542]" />
          <div className="h-3 w-full rounded bg-[#252542]" />
          <div className="h-3 w-3/4 rounded bg-[#252542]" />
        </div>
      </div>
    </div>
  );
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tip, setTip] = useState<MicrolearningTip | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedScript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, tipRes, recRes] = await Promise.allSettled([
          fetch('/api/dashboard/basic'),
          fetch('/api/tips/daily'),
          fetch('/api/scripts/recommendations'),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
          const data = await dashRes.value.json();
          setDashboardData(data);
        }

        if (tipRes.status === 'fulfilled' && tipRes.value.ok) {
          const data = await tipRes.value.json();
          setTip(data);
        }

        if (recRes.status === 'fulfilled' && recRes.value.ok) {
          const data = await recRes.value.json();
          setRecommendations(Array.isArray(data) ? data : data.scripts ?? []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-[#1A1A2E]" />
            <div className="h-4 w-40 rounded bg-[#1A1A2E]" />
          </div>
          <SkeletonTip />
          <SkeletonCard />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard className="h-40" />
        </div>
      </div>
    );
  }

  const userName = profile?.full_name?.split(' ')[0] || dashboardData?.profile?.full_name?.split(' ')[0] || 'Vendedor';
  const greeting = getGreeting();
  const isStarter = (profile?.plan || dashboardData?.profile?.plan) === 'starter';
  const suggestedTrail = dashboardData?.trails?.find((t) => t.used < t.total);

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-6xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Greeting */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {greeting}, {userName}!
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Aqui esta seu painel de vendas
          </p>
        </motion.div>

        {/* Microlearning Tip */}
        {tip && (
          <motion.div variants={itemVariants}>
            <TipCard tip={{ content: tip.content, category: tip.category ?? undefined }} />
          </motion.div>
        )}

        {/* Suggested Trail */}
        {suggestedTrail && (
          <motion.div variants={itemVariants}>
            <div
              className="flex cursor-pointer items-center justify-between rounded-xl border border-[#252542] bg-[#1A1A2E] p-5 transition-colors hover:border-[#0F3460]"
              onClick={() => router.push(`/trilhas/${suggestedTrail.slug}`)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{suggestedTrail.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[#E94560]">Trilha sugerida para agora</p>
                  <p className="text-base font-semibold text-white">{suggestedTrail.name}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
            </div>
          </motion.div>
        )}

        {/* Most Used Scripts */}
        {recommendations.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-[#E94560]" />
              Scripts mais usados
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.slice(0, 4).map((script) => (
                <motion.div
                  key={script.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer rounded-xl border border-[#252542] bg-[#1A1A2E] p-4 transition-colors hover:border-[#E94560]/30"
                  onClick={() => router.push(`/scripts/${script.id}`)}
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

        {/* Trail Progress */}
        {dashboardData?.trails && dashboardData.trails.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-[#E94560]" />
                Progresso das Trilhas
              </h2>
              <TrailProgress trails={dashboardData.trails} />
            </div>
          </motion.div>
        )}

        {/* Upgrade CTA for Starter plan */}
        {isStarter && (
          <motion.div variants={itemVariants}>
            <div className="relative overflow-hidden rounded-xl border border-[#252542] bg-[#1A1A2E] p-6">
              <div className="absolute inset-0 bg-gradient-to-r from-[#E94560]/5 to-[#0F3460]/5" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#E94560]" />
                  <h3 className="text-lg font-semibold text-white">Desbloqueie todo o potencial</h3>
                </div>
                <p className="mb-2 text-3xl font-bold text-white/30 blur-sm select-none">
                  Seus scripts geraram R$ ???
                </p>
                <p className="mb-4 text-sm text-[#94A3B8]">
                  Faca upgrade para ver suas metricas completas e acessar todos os scripts.
                </p>
                <button
                  onClick={() => router.push('/upgrade')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E94560] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E94560]/90"
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
