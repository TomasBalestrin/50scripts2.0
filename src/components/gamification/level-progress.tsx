'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { NewLevel } from '@/types/database';
import {
  NEW_LEVEL_THRESHOLDS,
  NEW_LEVEL_LABELS,
  NEW_LEVEL_ORDER,
} from '@/lib/constants';

interface LevelProgressProps {
  level: NewLevel;
  activeDays: number;
}

export function LevelProgress({ level, activeDays }: LevelProgressProps) {
  const {
    currentLabel,
    nextLevel,
    nextLabel,
    nextThreshold,
    currentThreshold,
    percentage,
    daysRemaining,
    isMaxLevel,
  } = useMemo(() => {
    const currentIdx = NEW_LEVEL_ORDER.indexOf(level);
    const curLabel = NEW_LEVEL_LABELS[level];
    const curThreshold = NEW_LEVEL_THRESHOLDS[level];
    const isMax = currentIdx >= NEW_LEVEL_ORDER.length - 1;

    if (isMax) {
      return {
        currentLabel: curLabel,
        nextLevel: null,
        nextLabel: null,
        nextThreshold: curThreshold,
        currentThreshold: curThreshold,
        percentage: 100,
        daysRemaining: 0,
        isMaxLevel: true,
      };
    }

    const next = NEW_LEVEL_ORDER[currentIdx + 1];
    const nxtThreshold = NEW_LEVEL_THRESHOLDS[next];
    const nxtLabel = NEW_LEVEL_LABELS[next];
    const range = nxtThreshold - curThreshold;
    const progress = activeDays - curThreshold;
    const pct = range > 0 ? Math.min(Math.max((progress / range) * 100, 0), 100) : 0;
    const remaining = Math.max(nxtThreshold - activeDays, 0);

    return {
      currentLabel: curLabel,
      nextLevel: next,
      nextLabel: nxtLabel,
      nextThreshold: nxtThreshold,
      currentThreshold: curThreshold,
      percentage: pct,
      daysRemaining: remaining,
      isMaxLevel: false,
    };
  }, [level, activeDays]);

  return (
    <div className="w-full space-y-3">
      {/* Level header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#F59E0B]" />
          <span className="text-lg font-bold text-white">{currentLabel}</span>
          <Badge
            variant="outline"
            className="border-[#1D4ED8]/50 bg-[#1D4ED8]/10 text-[#3B82F6] text-xs"
          >
            Nivel {NEW_LEVEL_ORDER.indexOf(level) + 1}
          </Badge>
        </div>
        <span className="text-xs text-[#94A3B8]">
          {activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'}
        </span>
      </div>

      {/* Progress toward next level */}
      {isMaxLevel ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <Star className="h-5 w-5 text-[#F59E0B]" />
          <span className="text-sm font-semibold text-[#F59E0B]">
            Nivel maximo atingido!
          </span>
        </div>
      ) : (
        <>
          {/* Level transition labels */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-white">{currentLabel}</span>
            <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
            <span className="font-medium text-[#3B82F6]">{nextLabel}</span>
            <span className="ml-auto text-xs text-[#94A3B8]">
              {activeDays}/{nextThreshold} dias
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#131B35]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #1D4ED8, #10B981)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{
                type: 'spring',
                stiffness: 60,
                damping: 15,
                duration: 0.8,
              }}
            />
          </div>

          {/* Info below bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">
              Faltam <span className="font-semibold text-white">{daysRemaining}</span>{' '}
              {daysRemaining === 1 ? 'dia' : 'dias'} para subir
            </span>
            <span className="text-xs text-[#10B981]">
              +10 scripts personalizados ao subir
            </span>
          </div>
        </>
      )}
    </div>
  );
}
