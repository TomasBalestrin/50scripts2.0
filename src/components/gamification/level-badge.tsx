'use client';

import { motion } from 'framer-motion';
import { Sprout, TrendingUp, Target, Crown, Gem } from 'lucide-react';
import { Level } from '@/types/database';
import { LEVEL_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

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

const SIZE_MAP = {
  sm: {
    container: 'h-12 w-12',
    icon: 'h-5 w-5',
    text: 'text-[10px]',
    glow: '0 0 12px',
    border: '2px',
  },
  md: {
    container: 'h-16 w-16',
    icon: 'h-7 w-7',
    text: 'text-xs',
    glow: '0 0 20px',
    border: '3px',
  },
  lg: {
    container: 'h-24 w-24',
    icon: 'h-10 w-10',
    text: 'text-sm',
    glow: '0 0 30px',
    border: '3px',
  },
};

interface LevelBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const currentLevel = (level as Level) || 'iniciante';
  const Icon = LEVEL_ICONS[currentLevel] || Sprout;
  const color = LEVEL_COLORS[currentLevel] || '#6B7280';
  const label = LEVEL_LABELS[currentLevel] || 'Iniciante';
  const sizeConfig = SIZE_MAP[size];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          sizeConfig.container
        )}
        style={{
          backgroundColor: `${color}15`,
          border: `${sizeConfig.border} solid ${color}`,
          boxShadow: `${sizeConfig.glow} ${color}60`,
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Glow pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid ${color}`,
            opacity: 0,
          }}
          animate={{
            scale: [1, 1.3],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />

        {/* Inner gradient */}
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}30, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <Icon className={cn('relative z-10', sizeConfig.icon)} />
      </motion.div>

      {/* Level name */}
      <motion.p
        className={cn('font-bold text-center', sizeConfig.text)}
        style={{ color }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {label}
      </motion.p>
    </div>
  );
}
