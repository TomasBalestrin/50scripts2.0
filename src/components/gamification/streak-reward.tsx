'use client';

import { motion } from 'framer-motion';
import { Flame, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakRewardProps {
  streak: number;
  isPending: boolean;
  onCollect: () => void;
}

export function StreakReward({ streak, isPending, onCollect }: StreakRewardProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Streak count */}
      <div className="flex items-center gap-2">
        <Flame
          className={`h-6 w-6 ${
            streak > 0
              ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]'
              : 'text-[#475569]'
          }`}
        />
        <span className="text-lg font-bold text-white">{streak}</span>
        <span className="text-sm text-[#94A3B8]">
          {streak === 1 ? 'dia seguido' : 'dias seguidos'}
        </span>
      </div>

      {/* Collect reward button */}
      {isPending && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 8px rgba(16,185,129,0.3)',
                '0 0 20px rgba(16,185,129,0.6)',
                '0 0 8px rgba(16,185,129,0.3)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-lg"
          >
            <Button
              onClick={onCollect}
              className="gap-2 bg-[#10B981] text-white hover:bg-[#10B981]/90 font-semibold"
            >
              <Gift className="h-4 w-4" />
              Coletar +5 scripts
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
