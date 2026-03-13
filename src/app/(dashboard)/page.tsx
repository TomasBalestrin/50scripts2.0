'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Sparkles,
  DollarSign,
  TrendingUp,
  Target,
  Route,
  Check,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { CyclicXpBar } from '@/components/gamification/cyclic-xp-bar';
import { LevelProgress } from '@/components/gamification/level-progress';
import { StreakReward } from '@/components/gamification/streak-reward';
import { LevelUpModal } from '@/components/gamification/level-up-modal';
import { CyclicXpRewardModal } from '@/components/gamification/cyclic-xp-reward-modal';
import { Card, CardContent } from '@/components/ui/card';
import { XpToast } from '@/components/gamification/xp-toast';
import type { NewLevel, UserDailyMission } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrailData {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  scriptsUsed: number;
  salesCount: number;
  salesTotal: number;
  trafficInvestment: number;
  costPerLead: number;
}

interface DashboardData {
  userName: string;
  activeDays: number;
  level: NewLevel;
  cyclicXp: number;
  streak: number;
  bonusScripts: number;
  streakRewardPending: boolean;
  cyclicXpRewardPending: boolean;
  scriptsUsed: number;
  personalizedGenerated: number;
  salesCount: number;
  salesTotal: number;
  trafficInvestmentTotal: number;
  costPerLead: number;
  trails: TrailData[];
  missions: UserDailyMission[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <div className="mb-3 h-4 w-3/4 rounded bg-[#131B35]" />
      <div className="mb-2 h-8 w-1/2 rounded bg-[#131B35]" />
      <div className="h-3 w-2/3 rounded bg-[#131B35]" />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <div className="mb-4 h-5 w-40 rounded bg-[#131B35]" />
      <div className="h-3 w-full rounded bg-[#131B35]" />
      <div className="mt-2 h-3 w-3/4 rounded bg-[#131B35]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Missions state
  const [missions, setMissions] = useState<UserDailyMission[]>([]);
  const [completingMission, setCompletingMission] = useState<string | null>(null);

  // Level up modal
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<NewLevel>('iniciante');

  // XP toast
  const [xpTrigger, setXpTrigger] = useState(0);

  // Streak pending (local, so we can toggle after collection)
  const [streakPending, setStreakPending] = useState(false);

  // Cyclic XP reward modal
  const [cyclicXpRewardOpen, setCyclicXpRewardOpen] = useState(false);

  // ------- Fetch dashboard data -------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch('/api/dashboard/all');
      if (!res.ok) throw new Error('Failed to fetch');
      const json: DashboardData = await res.json();
      setData(json);
      setMissions(json.missions ?? []);
      setStreakPending(json.streakRewardPending);
      if (json.cyclicXpRewardPending) {
        setCyclicXpRewardOpen(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ------- Register active day -------
  const registerActiveDay = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/active-day', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        if (result.cyclic_xp_added) {
          setXpTrigger((t) => t + 1);
        }
        if (result.leveled_up && result.level) {
          setLevelUpLevel(result.level as NewLevel);
          setLevelUpModalOpen(true);
        }
        if (result.streak_reward_pending) {
          setStreakPending(true);
        }
        if (result.cyclic_xp_reward_pending) {
          setCyclicXpRewardOpen(true);
        }
      }
    } catch {
      // Non-critical, silently ignore
    }
  }, []);

  // ------- Collect cyclic XP reward -------
  const handleCollectCyclicReward = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/collect-cyclic-reward', {
        method: 'POST',
      });
      if (res.ok) {
        setCyclicXpRewardOpen(false);
        fetchData();
      }
    } catch {
      // Silently ignore
    }
  }, [fetchData]);

  // ------- Collect streak reward -------
  const handleCollectStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/collect-streak', {
        method: 'POST',
      });
      if (res.ok) {
        setStreakPending(false);
        // Refresh data to update bonus_scripts
        fetchData();
      }
    } catch {
      // Silently ignore
    }
  }, [fetchData]);

  // ------- Complete mission -------
  const handleCompleteMission = useCallback(async (missionId: string) => {
    setCompletingMission(missionId);
    try {
      const res = await fetch('/api/gamification/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId }),
      });
      if (res.ok) {
        setMissions((prev) =>
          prev.map((m) =>
            m.mission_id === missionId
              ? { ...m, completed: true, completed_at: new Date().toISOString(), xp_awarded: 20 }
              : m
          )
        );
        setXpTrigger((t) => t + 1);
      }
    } catch {
      // Silently ignore
    } finally {
      setCompletingMission(null);
    }
  }, []);

  // ------- Init on mount -------
  useEffect(() => {
    fetchData();
    registerActiveDay();
  }, [fetchData, registerActiveDay]);

  // ------- Loading state -------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-[#0A0F1E]" />
            <div className="h-4 w-48 rounded bg-[#0A0F1E]" />
          </div>
          <div className="animate-pulse rounded-xl bg-[#1D4ED8]/10 p-5">
            <div className="h-4 w-3/4 rounded bg-[#131B35]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
        </div>
      </div>
    );
  }

  // ------- Error state -------
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-red-400">Erro ao carregar o painel</p>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Tente recarregar a página ou volte em alguns instantes.
            </p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-lg bg-[#1D4ED8] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]/90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userName = data.userName?.split(' ')[0] || 'Usuário';
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-5xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ================================================================ */}
        {/* Greeting */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {greeting}, {userName}!
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Bem-vindo ao seu painel de gestão!
          </p>
        </motion.div>

        {/* ================================================================ */}
        {/* Daily Missions */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-[#F59E0B]/30 bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/20">
                <Crosshair className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                  Missões do dia
                </p>
                <p className="text-[10px] text-[#94A3B8]">
                  +20 XP por missão concluída
                </p>
              </div>
            </div>
            {missions.length > 0 ? (
              <div className="space-y-2">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                      mission.completed
                        ? 'border-[#10B981]/30 bg-[#10B981]/10'
                        : 'border-[#131B35] bg-[#0A0F1E]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          mission.completed
                            ? 'text-[#10B981] line-through'
                            : 'text-white'
                        }`}
                      >
                        {mission.title}
                      </p>
                      {mission.description && !mission.completed && (
                        <p className="mt-0.5 text-xs text-[#94A3B8]">
                          {mission.description}
                        </p>
                      )}
                    </div>
                    {mission.completed ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]/20">
                        <Check className="h-4 w-4 text-[#10B981]" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteMission(mission.mission_id)}
                        disabled={completingMission === mission.mission_id}
                        className="shrink-0 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#F59E0B]/80 disabled:opacity-50"
                      >
                        {completingMission === mission.mission_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Concluir'
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[#131B35] bg-[#0A0F1E] px-3 py-4 text-center">
                <p className="text-sm text-[#94A3B8]">
                  Nenhuma missão disponível hoje
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Novas missões serão atribuídas em breve
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* 3 Indicator Cards */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Scripts Utilizados */}
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1D4ED8]/15">
                  <Copy className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">
                    Scripts Utilizados
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {data.scriptsUsed}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Personalizados Gerados */}
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15">
                  <Sparkles className="h-6 w-6 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">
                    Personalizados Gerados
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {data.personalizedGenerated}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vendas Geradas */}
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15">
                  <DollarSign className="h-6 w-6 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">
                    Vendas Geradas
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {data.salesCount}
                  </p>
                  <p className="text-xs text-[#10B981]">
                    {formatCurrency(data.salesTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* Level Section */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="p-5">
              <LevelProgress
                level={data.level as NewLevel}
                activeDays={data.activeDays}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ================================================================ */}
        {/* XP + Streak side by side */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* XP Section */}
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="p-5">
                <CyclicXpBar xp={data.cyclicXp} max={100} />
              </CardContent>
            </Card>

            {/* Streak Section */}
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="flex flex-col items-center justify-center p-5">
                <StreakReward
                  streak={data.streak}
                  isPending={streakPending}
                  onCollect={handleCollectStreak}
                />
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* Trail Progress */}
        {/* ================================================================ */}
        {data.trails.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <Route className="h-5 w-5 text-[#1D4ED8]" />
                  Progresso por Trilha
                </h2>
                <div className="space-y-3">
                  {data.trails.map((trail) => (
                    <div
                      key={trail.id}
                      className="flex items-center gap-4 rounded-lg border border-[#131B35]/50 bg-[#020617] px-4 py-3"
                    >
                      {/* Icon */}
                      <span className="text-xl">{trail.icon}</span>

                      {/* Name + stats */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {trail.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            {trail.scriptsUsed}{' '}
                            {trail.scriptsUsed === 1 ? 'script' : 'scripts'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {trail.salesCount}{' '}
                            {trail.salesCount === 1 ? 'venda' : 'vendas'}
                          </span>
                          {trail.salesTotal > 0 && (
                            <span className="flex items-center gap-1 text-[#10B981]">
                              <TrendingUp className="h-3 w-3" />
                              {formatCurrency(trail.salesTotal)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Color indicator bar */}
                      <div
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: trail.color }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* Traffic Investment */}
        {/* ================================================================ */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
                Investimento em Tráfego
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[#131B35]/50 bg-[#020617] p-4">
                  <p className="text-xs font-medium text-[#94A3B8]">Total Investido</p>
                  <p className="mt-1 text-2xl font-bold text-[#8B5CF6]">
                    {formatCurrency(data.trafficInvestmentTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#131B35]/50 bg-[#020617] p-4">
                  <p className="text-xs font-medium text-[#94A3B8]">Custo por Lead</p>
                  <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
                    {data.costPerLead > 0 ? formatCurrency(data.costPerLead) : 'R$ 0,00'}
                  </p>
                  <p className="mt-1 text-[10px] text-[#64748B]">
                    investimento / scripts usados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ================================================================ */}
      {/* Level Up Modal */}
      {/* ================================================================ */}
      <LevelUpModal
        level={levelUpLevel}
        isOpen={levelUpModalOpen}
        onClose={() => setLevelUpModalOpen(false)}
      />
      <CyclicXpRewardModal
        isOpen={cyclicXpRewardOpen}
        onCollect={handleCollectCyclicReward}
        onClose={() => setCyclicXpRewardOpen(false)}
      />
      <XpToast amount={20} trigger={xpTrigger} />
    </div>
  );
}
