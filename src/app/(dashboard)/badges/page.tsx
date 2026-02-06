'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Shield, Percent, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { LevelBadge } from '@/components/gamification/level-badge';
import { XpBar } from '@/components/gamification/xp-bar';
import { StreakCounter } from '@/components/gamification/streak-counter';
import { BadgeGrid } from '@/components/gamification/badge-grid';

interface BadgeData {
  type: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earned_at?: string;
}

interface GamificationStatus {
  xp_points: number;
  level: string;
  current_streak: number;
  longest_streak: number;
}

const ALL_BADGES: BadgeData[] = [
  {
    type: 'first_script',
    name: 'Primeiro Script',
    icon: 'ScrollText',
    description: 'Use seu primeiro script',
    earned: false,
  },
  {
    type: 'first_sale',
    name: 'Primeira Venda',
    icon: 'DollarSign',
    description: 'Registre sua primeira venda',
    earned: false,
  },
  {
    type: 'streak_7',
    name: 'Semana de Fogo',
    icon: 'Flame',
    description: '7 dias seguidos de uso',
    earned: false,
  },
  {
    type: 'streak_30',
    name: 'Mes Imparavel',
    icon: 'CalendarCheck',
    description: '30 dias seguidos de uso',
    earned: false,
  },
  {
    type: 'scripts_50',
    name: 'Mestre dos Scripts',
    icon: 'BookOpen',
    description: 'Use 50 scripts diferentes',
    earned: false,
  },
  {
    type: 'revenue_10k',
    name: 'Top 10K',
    icon: 'TrendingUp',
    description: 'Gere R$ 10.000 em vendas',
    earned: false,
  },
  {
    type: 'all_trails',
    name: 'Explorador',
    icon: 'Map',
    description: 'Complete todas as trilhas',
    earned: false,
  },
  {
    type: 'ai_10',
    name: 'AI Expert',
    icon: 'Bot',
    description: 'Gere 10 scripts com IA',
    earned: false,
  },
  {
    type: 'referrals_5',
    name: 'Influenciador',
    icon: 'Users',
    description: 'Indique 5 amigos',
    earned: false,
  },
];

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

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[#1A1A2E] ${className}`}>
      <div className="p-5 space-y-3">
        <div className="h-4 w-1/3 rounded bg-[#252542]" />
        <div className="h-3 w-full rounded bg-[#252542]" />
        <div className="h-2.5 w-2/3 rounded bg-[#252542]" />
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const { profile, loading: authLoading } = useAuth();
  const [badges, setBadges] = useState<BadgeData[]>(ALL_BADGES);
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [badgesRes, statusRes] = await Promise.allSettled([
          fetch('/api/gamification/badges'),
          fetch('/api/gamification/status'),
        ]);

        if (badgesRes.status === 'fulfilled' && badgesRes.value.ok) {
          const data = await badgesRes.value.json();
          const earnedBadges: Array<{ badge_type: string; earned_at: string }> =
            Array.isArray(data) ? data : data.badges ?? [];

          const earnedMap = new Map(
            earnedBadges.map((b) => [b.badge_type, b.earned_at])
          );

          setBadges(
            ALL_BADGES.map((badge) => ({
              ...badge,
              earned: earnedMap.has(badge.type),
              earned_at: earnedMap.get(badge.type),
            }))
          );
        }

        if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
          const data = await statusRes.value.json();
          setStatus({
            xp_points: data.xp_points ?? profile?.xp_points ?? 0,
            level: data.level ?? profile?.level ?? 'iniciante',
            current_streak: data.current_streak ?? profile?.current_streak ?? 0,
            longest_streak: data.longest_streak ?? profile?.longest_streak ?? 0,
          });
        } else if (profile) {
          setStatus({
            xp_points: profile.xp_points ?? 0,
            level: profile.level ?? 'iniciante',
            current_streak: profile.current_streak ?? 0,
            longest_streak: profile.longest_streak ?? 0,
          });
        }
      } catch (err) {
        console.error('Error fetching badges data:', err);
        if (profile) {
          setStatus({
            xp_points: profile.xp_points ?? 0,
            level: profile.level ?? 'iniciante',
            current_streak: profile.current_streak ?? 0,
            longest_streak: profile.longest_streak ?? 0,
          });
        }
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, profile]);

  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length;
  const completionPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-48 rounded bg-[#1A1A2E]" />
            <div className="h-4 w-64 rounded bg-[#1A1A2E]" />
          </div>
          <SkeletonBlock className="h-40" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const xp = status?.xp_points ?? profile?.xp_points ?? 0;
  const level = status?.level ?? profile?.level ?? 'iniciante';
  const currentStreak = status?.current_streak ?? profile?.current_streak ?? 0;
  const longestStreak = status?.longest_streak ?? profile?.longest_streak ?? 0;

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-4xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            <Award className="h-7 w-7 text-[#E94560]" />
            Conquistas
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Acompanhe seu progresso e desbloqueie todas as badges
          </p>
        </motion.div>

        {/* Top section: Level + XP + Streak */}
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-5 sm:p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Level badge (large) */}
              <div className="shrink-0">
                <LevelBadge level={level} size="lg" />
              </div>

              {/* XP bar + stats */}
              <div className="flex-1 w-full space-y-4">
                <XpBar xp={xp} level={level} />

                <div className="flex items-center justify-between rounded-lg bg-[#252542]/50 px-4 py-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{xp}</p>
                    <p className="text-[10px] text-[#94A3B8]">XP Total</p>
                  </div>
                  <div className="h-8 w-px bg-[#3A3A5C]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{earnedCount}</p>
                    <p className="text-[10px] text-[#94A3B8]">Badges</p>
                  </div>
                  <div className="h-8 w-px bg-[#3A3A5C]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{completionPct}%</p>
                    <p className="text-[10px] text-[#94A3B8]">Completo</p>
                  </div>
                </div>
              </div>

              {/* Streak counter */}
              <div className="shrink-0">
                <StreakCounter current={currentStreak} longest={longestStreak} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#252542] bg-[#1A1A2E] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E94560]/15">
                <Shield className="h-5 w-5 text-[#E94560]" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {earnedCount}/{totalCount}
                </p>
                <p className="text-[10px] text-[#94A3B8] sm:text-xs">Badges conquistadas</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#252542] bg-[#1A1A2E] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <Percent className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{completionPct}%</p>
                <p className="text-[10px] text-[#94A3B8] sm:text-xs">Progresso total</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#252542] bg-[#1A1A2E] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
                <Award className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {totalCount - earnedCount}
                </p>
                <p className="text-[10px] text-[#94A3B8] sm:text-xs">Faltam desbloquear</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Badge grid */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Todas as Badges</h2>
            <span className="text-xs text-[#94A3B8]">
              {earnedCount} de {totalCount} desbloqueadas
            </span>
          </div>
          <BadgeGrid badges={badges} />
        </motion.div>

        {/* Completion encouragement */}
        {earnedCount < totalCount && (
          <motion.div variants={itemVariants}>
            <div className="relative overflow-hidden rounded-xl border border-[#252542] bg-[#1A1A2E] p-5">
              <div className="absolute inset-0 bg-gradient-to-r from-[#E94560]/5 to-[#0F3460]/5" />
              <div className="relative text-center">
                <p className="text-sm font-medium text-white">
                  {completionPct < 25 &&
                    'Voce esta comecando sua jornada! Continue usando a plataforma para desbloquear novas conquistas.'}
                  {completionPct >= 25 &&
                    completionPct < 50 &&
                    'Bom progresso! Continue assim e logo voce tera metade das badges.'}
                  {completionPct >= 50 &&
                    completionPct < 75 &&
                    'Mais da metade conquistada! Voce esta no caminho certo para completar todas.'}
                  {completionPct >= 75 &&
                    completionPct < 100 &&
                    'Quase la! Faltam poucas badges para a colecao completa.'}
                </p>
                {/* Completion progress bar */}
                <div className="mx-auto mt-3 max-w-xs">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#252542]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#E94560] to-[#8B5CF6]"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 12, delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* All complete celebration */}
        {earnedCount === totalCount && totalCount > 0 && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-yellow-500/30 bg-[#1A1A2E] p-6 text-center"
          >
            <motion.div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/15"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Award className="h-8 w-8 text-yellow-400" />
            </motion.div>
            <h3 className="text-lg font-bold text-yellow-400">
              Colecao Completa!
            </h3>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Parabens! Voce desbloqueou todas as badges. Voce e um verdadeiro Elite!
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
