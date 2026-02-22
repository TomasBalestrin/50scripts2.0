'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { CYCLIC_XP_MAX } from '@/lib/constants';

interface CyclicXpBarProps {
  xp: number;
  max?: number;
}

export function CyclicXpBar({ xp, max = CYCLIC_XP_MAX }: CyclicXpBarProps) {
  const percentage = useMemo(() => {
    return Math.min(Math.max((xp / max) * 100, 0), 100);
  }, [xp, max]);

  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-[#3B82F6]" />
        <span className="text-sm font-semibold text-white">XP</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#131B35]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15, duration: 0.8 }}
        />
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{
            width: `${percentage}%`,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">
          {xp} / {max} XP
        </span>
        <span className="text-xs text-[#94A3B8]">
          Ao atingir {max}: +5 scripts
        </span>
      </div>
    </div>
  );
}
