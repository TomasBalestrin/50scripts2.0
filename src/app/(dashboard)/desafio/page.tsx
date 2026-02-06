'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Zap, Flame, CalendarDays, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DailyChallenge } from '@/types/database';
import { ChallengeCard } from '@/components/gamification/challenge-card';
import { StreakCounter } from '@/components/gamification/streak-counter';

interface ChallengeStats {
  totalCompleted: number;
  totalXpEarned: number;
  currentStreak: number;
  longestStreak: number;
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

export default function DesafioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [stats, setStats] = useState<ChallengeStats>({
    totalCompleted: 0,
    totalXpEarned: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenge() {
      try {
        const [challengeRes, statusRes] = await Promise.allSettled([
          fetch('/api/gamification/challenge'),
          fetch('/api/gamification/status'),
        ]);

        if (challengeRes.status === 'fulfilled' && challengeRes.value.ok) {
          const data = await challengeRes.value.json();
          setChallenge(data.challenge || data);
        }

        if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
          const data = await statusRes.value.json();
          setStats({
            totalCompleted: data.challenges_completed ?? 0,
            totalXpEarned: data.total_challenge_xp ?? 0,
            currentStreak: data.current_streak ?? profile?.current_streak ?? 0,
            longestStreak: data.longest_streak ?? profile?.longest_streak ?? 0,
          });
        } else if (profile) {
          setStats((prev) => ({
            ...prev,
            currentStreak: profile.current_streak ?? 0,
            longestStreak: profile.longest_streak ?? 0,
          }));
        }
      } catch (err) {
        console.error('Error fetching challenge data:', err);
        setError('Erro ao carregar desafios. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchChallenge();
    }
  }, [authLoading, profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-56 rounded bg-[#1A1A2E]" />
            <div className="h-4 w-72 rounded bg-[#1A1A2E]" />
          </div>
          <SkeletonBlock className="h-36" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-24" />
            ))}
          </div>
          <SkeletonBlock className="h-48" />
        </div>
      </div>
    );
  }

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
            <Target className="h-7 w-7 text-[#E94560]" />
            Desafios
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Complete desafios diarios para ganhar XP extra e subir de nivel
          </p>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Today's challenge (big card) */}
        <motion.div variants={itemVariants}>
          <div className="mb-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarDays className="h-5 w-5 text-[#E94560]" />
              Desafio de Hoje
            </h2>
          </div>
          <ChallengeCard challenge={challenge} />
        </motion.div>

        {/* Stats cards */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Total completed */}
            <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                <Trophy className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">{stats.totalCompleted}</p>
              <p className="text-[10px] text-[#94A3B8] sm:text-xs">Desafios concluidos</p>
            </div>

            {/* Total XP earned */}
            <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/15">
                <Zap className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="text-xl font-bold text-white">{stats.totalXpEarned}</p>
              <p className="text-[10px] text-[#94A3B8] sm:text-xs">XP de desafios</p>
            </div>

            {/* Current streak */}
            <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
              <p className="text-xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-[10px] text-[#94A3B8] sm:text-xs">Sequencia atual</p>
            </div>

            {/* Longest streak */}
            <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-xl font-bold text-white">{stats.longestStreak}</p>
              <p className="text-[10px] text-[#94A3B8] sm:text-xs">Recorde</p>
            </div>
          </div>
        </motion.div>

        {/* Motivational section */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-xl border border-[#252542] bg-[#1A1A2E] p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#E94560]/5 via-transparent to-[#0F3460]/5" />

            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
              {/* Streak counter */}
              <StreakCounter
                current={stats.currentStreak}
                longest={stats.longestStreak}
              />

              {/* Motivational text */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="mb-2 text-lg font-bold text-white">
                  {stats.currentStreak > 0
                    ? `Sua sequencia de desafios: ${stats.currentStreak} ${
                        stats.currentStreak === 1 ? 'dia' : 'dias'
                      }`
                    : 'Comece sua sequencia hoje!'}
                </h3>
                <p className="text-sm text-[#94A3B8]">
                  {stats.currentStreak === 0 &&
                    'Complete o desafio de hoje para iniciar uma nova sequencia e ganhar bonus de XP.'}
                  {stats.currentStreak > 0 &&
                    stats.currentStreak < 7 &&
                    `Continue completando desafios! Faltam ${
                      7 - stats.currentStreak
                    } dias para o bonus de sequencia de 7 dias (+100 XP).`}
                  {stats.currentStreak >= 7 &&
                    stats.currentStreak < 30 &&
                    `Incrivel! Voce ja conquistou o bonus de 7 dias. Continue ate 30 dias para um bonus ainda maior!`}
                  {stats.currentStreak >= 30 &&
                    'Voce e uma lenda! Sua dedicacao e inspiradora. Continue brilhando!'}
                </p>

                {/* Progress toward next milestone */}
                {stats.currentStreak > 0 && stats.currentStreak < 30 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8]">
                        Proximo bonus: {stats.currentStreak < 7 ? '7 dias' : '30 dias'}
                      </span>
                      <span className="font-medium text-white">
                        {stats.currentStreak}/{stats.currentStreak < 7 ? 7 : 30}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#252542]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${
                            stats.currentStreak < 7
                              ? (stats.currentStreak / 7) * 100
                              : (stats.currentStreak / 30) * 100
                          }%`,
                        }}
                        transition={{ type: 'spring', stiffness: 50, damping: 12 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Como funciona</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E94560]/15 text-[10px] font-bold text-[#E94560]">
                  1
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Todo dia um novo desafio e gerado automaticamente para voce
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E94560]/15 text-[10px] font-bold text-[#E94560]">
                  2
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Complete o desafio usando a plataforma normalmente
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E94560]/15 text-[10px] font-bold text-[#E94560]">
                  3
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Ganhe XP bonus e mantenha sua sequencia para desbloquear recompensas
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
