'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CyclicXpRewardModalProps {
  isOpen: boolean;
  onCollect: () => Promise<void>;
  onClose: () => void;
}

export function CyclicXpRewardModal({
  isOpen,
  onCollect,
  onClose,
}: CyclicXpRewardModalProps) {
  const [collecting, setCollecting] = useState(false);

  const fireConfetti = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#1D4ED8', '#10B981', '#F59E0B', '#8B5CF6'],
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 50,
          origin: { x: 0 },
          colors: ['#3B82F6', '#1D4ED8', '#10B981'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 50,
          origin: { x: 1 },
          colors: ['#3B82F6', '#1D4ED8', '#10B981'],
        });
      }, 200);
    } catch {
      // canvas-confetti not available
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
    }
  }, [isOpen, fireConfetti]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      await onCollect();
      // Fire confetti again on collect
      fireConfetti();
    } finally {
      setCollecting(false);
    }
  };

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
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[#3B82F6]/30 bg-[#0A0F1E] p-8 shadow-2xl shadow-[#3B82F6]/20"
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
              {/* Animated XP icon */}
              <motion.div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8]"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(59,130,246,0.3)',
                    '0 0 40px rgba(59,130,246,0.6)',
                    '0 0 20px rgba(59,130,246,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap className="h-10 w-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.div
                className="mb-2 flex items-center gap-2"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-[#3B82F6]">
                  100 XP Completados!
                </span>
              </motion.div>

              {/* Subtitle */}
              <motion.h2
                className="mb-2 text-2xl font-extrabold text-white"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Parabens!
              </motion.h2>

              {/* Message */}
              <motion.p
                className="mb-6 text-sm leading-relaxed text-[#94A3B8]"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Voce completou o ciclo de 100 XP! Sua dedicacao esta sendo
                recompensada. Continue usando a plataforma para ganhar mais!
              </motion.p>

              {/* Reward info */}
              <motion.div
                className="mb-6 w-full rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-5 w-5 text-[#10B981]" />
                  <p className="text-sm font-semibold text-[#10B981]">
                    +5 scripts personalizados
                  </p>
                </div>
              </motion.div>

              {/* Collect button */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full"
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
                    onClick={handleCollect}
                    disabled={collecting}
                    className="w-full gap-2 bg-[#10B981] text-white hover:bg-[#10B981]/90 font-semibold"
                  >
                    <Gift className="h-4 w-4" />
                    {collecting ? 'Coletando...' : 'Coletar Recompensa'}
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
