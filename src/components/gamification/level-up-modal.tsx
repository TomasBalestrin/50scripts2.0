'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NewLevel } from '@/types/database';
import {
  NEW_LEVEL_LABELS,
  NEW_LEVEL_ORDER,
  LEVEL_MOTIVATIONAL_MESSAGES,
} from '@/lib/constants';

interface LevelUpModalProps {
  level: NewLevel;
  isOpen: boolean;
  onClose: () => void;
}

export function LevelUpModal({ level, isOpen, onClose }: LevelUpModalProps) {
  const label = NEW_LEVEL_LABELS[level];
  const levelNumber = NEW_LEVEL_ORDER.indexOf(level) + 1;
  const message = LEVEL_MOTIVATIONAL_MESSAGES[level] ?? 'Parabens! Voce subiu de nivel!';

  const fireConfetti = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;

      // First burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1D4ED8', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      });

      // Second burst after a short delay
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#1D4ED8', '#3B82F6', '#10B981', '#F59E0B'],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#1D4ED8', '#3B82F6', '#10B981', '#F59E0B'],
        });
      }, 250);
    } catch {
      // canvas-confetti not available, silently skip
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
    }
  }, [isOpen, fireConfetti]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal card */}
          <motion.div
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[#1D4ED8]/30 bg-[#0A0F1E] p-8 shadow-2xl shadow-[#1D4ED8]/20"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-[#94A3B8] transition-colors hover:bg-[#131B35] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              {/* Animated trophy icon */}
              <motion.div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6]"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(29,78,216,0.3)',
                    '0 0 40px rgba(59,130,246,0.5)',
                    '0 0 20px rgba(29,78,216,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy className="h-10 w-10 text-white" />
              </motion.div>

              {/* Level up text */}
              <motion.div
                className="mb-2 flex items-center gap-2"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="h-5 w-5 text-[#F59E0B]" />
                <span className="text-sm font-semibold uppercase tracking-wider text-[#F59E0B]">
                  Subiu de Nivel!
                </span>
                <Sparkles className="h-5 w-5 text-[#F59E0B]" />
              </motion.div>

              {/* Level name */}
              <motion.h2
                className="mb-1 text-3xl font-extrabold text-white"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {label}
              </motion.h2>

              {/* Level number */}
              <motion.p
                className="mb-6 text-sm text-[#94A3B8]"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Nivel {levelNumber} de {NEW_LEVEL_ORDER.length}
              </motion.p>

              {/* Motivational message */}
              <motion.p
                className="mb-6 text-sm leading-relaxed text-[#94A3B8]"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {message}
              </motion.p>

              {/* Reward info */}
              <motion.div
                className="mb-6 w-full rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm font-semibold text-[#10B981]">
                  +10 scripts personalizados desbloqueados!
                </p>
              </motion.div>

              {/* Close button */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full"
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
                >
                  Continuar
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
