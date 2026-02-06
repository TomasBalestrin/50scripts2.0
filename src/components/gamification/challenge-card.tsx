'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Zap, Target, Sparkles } from 'lucide-react';

const CHALLENGE_LABELS: Record<string, string> = {
  use_scripts: 'Use scripts de vendas',
  rate_scripts: 'Avalie scripts',
  register_sales: 'Registre vendas',
  complete_trail: 'Complete trilhas',
  use_ai: 'Use a IA para gerar scripts',
  login_streak: 'Mantenha sua sequencia',
};

const MOTIVATIONAL_TEXTS = [
  'Voce esta quase la!',
  'Continue assim!',
  'Falta pouco!',
  'Nao desista agora!',
  'Voce consegue!',
];

function getMotivationalText(pct: number): string {
  if (pct >= 75) return 'Falta muito pouco!';
  if (pct >= 50) return 'Metade do caminho!';
  if (pct >= 25) return 'Continue assim!';
  return 'Vamos comecar!';
}

interface ChallengeData {
  challenge_type: string;
  target_count: number;
  current_count: number;
  completed: boolean;
  xp_reward: number;
}

interface ChallengeCardProps {
  challenge: ChallengeData | null;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  if (!challenge) {
    return (
      <div className="rounded-xl border border-[#252542] bg-[#1A1A2E] p-5">
        <div className="flex items-center gap-3 text-[#4A4A6A]">
          <Target className="h-6 w-6" />
          <div>
            <p className="text-sm font-medium text-[#94A3B8]">Sem desafio hoje</p>
            <p className="text-xs text-[#4A4A6A]">Volte amanha para um novo desafio!</p>
          </div>
        </div>
      </div>
    );
  }

  const { challenge_type, target_count, current_count, completed, xp_reward } = challenge;
  const percentage = target_count > 0 ? Math.min((current_count / target_count) * 100, 100) : 0;
  const label = CHALLENGE_LABELS[challenge_type] || challenge_type;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border p-5 ${
        completed
          ? 'border-emerald-500/30 bg-[#1A1A2E]'
          : 'border-[#252542] bg-[#1A1A2E]'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background glow when completed */}
      {completed && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
      )}

      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                completed ? 'bg-emerald-500/20' : 'bg-[#E94560]/15'
              }`}
            >
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Target className="h-5 w-5 text-[#E94560]" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                Desafio do dia
              </p>
              <p className="text-sm font-semibold text-white">{label}</p>
            </div>
          </div>

          {/* XP reward */}
          <div className="flex items-center gap-1 rounded-full bg-[#252542] px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">+{xp_reward} XP</span>
          </div>
        </div>

        {/* Progress section */}
        {completed ? (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">
              Concluido! +{xp_reward} XP
            </p>
          </motion.div>
        ) : (
          <div>
            {/* Progress bar */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-[#94A3B8]">
                {current_count} / {target_count}
              </span>
              <span className="text-xs font-medium text-white">
                {Math.round(percentage)}%
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#252542]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E94560] to-[#F59E0B]"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 12, duration: 1 }}
              />
              {/* Shimmer */}
              <motion.div
                className="absolute inset-y-0 rounded-full opacity-40"
                style={{
                  width: `${percentage}%`,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Motivational text */}
            <p className="mt-2 text-xs text-[#94A3B8]">
              {getMotivationalText(percentage)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
