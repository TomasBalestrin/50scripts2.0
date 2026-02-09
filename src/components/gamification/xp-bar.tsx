'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sprout, TrendingUp, Target, Crown, Gem } from 'lucide-react';
import { Level } from '@/types/database';
import { LEVEL_THRESHOLDS, LEVEL_LABELS } from '@/lib/constants';

const LEVEL_COLORS: Record<Level, string> = {
  iniciante: '#6B7280',
  vendedor: '#3B82F6',
  closer: '#8B5CF6',
  topseller: '#F59E0B',
  elite: '#EF4444',
};

const LEVEL_ICONS: Record<Level, React.ComponentType<{ className?: string }>> = {
  iniciante: Sprout,
  vendedor: TrendingUp,
  closer: Target,
  topseller: Crown,
  elite: Gem,
};

const LEVEL_ORDER: Level[] = ['iniciante', 'vendedor', 'closer', 'topseller', 'elite'];

function getNextLevel(currentLevel: Level): Level | null {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx < LEVEL_ORDER.length - 1) {
    return LEVEL_ORDER[idx + 1];
  }
  return null;
}

function getXpForNextLevel(currentLevel: Level): number {
  const next = getNextLevel(currentLevel);
  if (!next) return LEVEL_THRESHOLDS.elite;
  return LEVEL_THRESHOLDS[next];
}

function getXpForCurrentLevel(currentLevel: Level): number {
  return LEVEL_THRESHOLDS[currentLevel];
}

interface XpBarProps {
  xp: number;
  level: string;
}

export function XpBar({ xp, level }: XpBarProps) {
  const currentLevel = (level as Level) || 'iniciante';
  const Icon = LEVEL_ICONS[currentLevel] || Sprout;
  const color = LEVEL_COLORS[currentLevel] || '#6B7280';
  const label = LEVEL_LABELS[currentLevel] || 'Iniciante';

  const nextLevel = getNextLevel(currentLevel);
  const nextColor = nextLevel ? LEVEL_COLORS[nextLevel] : color;

  const currentThreshold = getXpForCurrentLevel(currentLevel);
  const nextThreshold = getXpForNextLevel(currentLevel);

  const { percentage, xpInLevel, xpNeeded } = useMemo(() => {
    if (!nextLevel) {
      return { percentage: 100, xpInLevel: xp - currentThreshold, xpNeeded: 0 };
    }
    const range = nextThreshold - currentThreshold;
    const progress = xp - currentThreshold;
    const pct = range > 0 ? Math.min(Math.max((progress / range) * 100, 0), 100) : 0;
    return { percentage: pct, xpInLevel: progress, xpNeeded: range };
  }, [xp, currentThreshold, nextThreshold, nextLevel]);

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Level icon + name */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20`, border: `2px solid ${color}` }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="text-[10px] text-[#94A3B8]">
            {nextLevel ? `${xp} / ${nextThreshold} XP` : `${xp} XP (Max)`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#131B35]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}, ${nextColor})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15, duration: 0.8 }}
          />
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full opacity-30"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between sm:hidden">
          <p className="text-[10px] font-medium text-white">{label}</p>
          <p className="text-[10px] text-[#94A3B8]">
            {nextLevel ? `${xpInLevel}/${xpNeeded}` : 'MAX'}
          </p>
        </div>
      </div>

      {/* XP count on desktop */}
      {nextLevel && (
        <div className="hidden sm:block shrink-0">
          <p className="text-xs font-bold text-white">{Math.round(percentage)}%</p>
        </div>
      )}
    </div>
  );
}
