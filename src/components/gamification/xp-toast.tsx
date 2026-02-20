'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface XpToastProps {
  /** Amount of XP to display (e.g. 5, 10) */
  amount: number;
  /** Unique key to trigger a new toast (change this to show again) */
  trigger: number;
}

/**
 * Discreet floating "+N XP" toast that slides up from bottom-right
 * and auto-dismisses after 2.5 seconds.
 */
export function XpToast({ amount, trigger }: XpToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    if (trigger === 0) return;
    setDisplayAmount(amount);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [trigger, amount]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed bottom-32 right-4 z-[70] lg:bottom-8 lg:right-8"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-[#1D4ED8]/30 bg-[#0A0F1E]/95 px-3 py-1.5 shadow-lg shadow-[#1D4ED8]/10 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">
              +{displayAmount} XP
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
