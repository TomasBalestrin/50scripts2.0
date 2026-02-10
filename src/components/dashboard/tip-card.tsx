'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';

interface TipCardProps {
  tip: { content: string; category?: string };
}

const TIP_DURATION = 15000; // 15 seconds

export function TipCard({ tip }: TipCardProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, TIP_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] p-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {tip.category && (
                <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                  {tip.category}
                </span>
              )}
              <p className="text-sm leading-relaxed text-white/95">{tip.content}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Fechar dica"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar - pure CSS animation instead of setInterval */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-white/40"
              style={{
                animation: `tipProgress ${TIP_DURATION}ms linear forwards`,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
