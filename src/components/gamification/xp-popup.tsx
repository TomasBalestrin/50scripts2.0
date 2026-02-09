'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface XpPopupProps {
  amount: number;
  visible: boolean;
  onComplete?: () => void;
}

export function XpPopup({ amount, visible, onComplete }: XpPopupProps) {
  useEffect(() => {
    if (visible && onComplete) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex items-center gap-2 rounded-full bg-[#0A0F1E] border border-yellow-400/30 px-5 py-2.5 shadow-2xl"
            style={{
              boxShadow: '0 0 30px rgba(250,204,21,0.2), 0 4px 20px rgba(0,0,0,0.5)',
            }}
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{
              y: -40,
              opacity: [1, 1, 0],
              scale: [0.5, 1.1, 1],
            }}
            exit={{ opacity: 0, y: -60 }}
            transition={{
              duration: 1.5,
              times: [0, 0.3, 1],
              ease: 'easeOut',
            }}
          >
            {/* Spark particles */}
            <motion.div
              className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-yellow-300"
              animate={{
                y: [-5, -20],
                x: [-5, -15],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.div
              className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-yellow-200"
              animate={{
                y: [-5, -18],
                x: [5, 12],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.div
              className="absolute top-0 left-1/2 h-1 w-1 rounded-full bg-yellow-400"
              animate={{
                y: [-8, -25],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{ duration: 0.7, delay: 0.15 }}
            />

            <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            <span className="text-lg font-bold text-yellow-400">
              +{amount} XP
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
