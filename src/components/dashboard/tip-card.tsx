'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';

interface TipCardProps {
  tip: { content: string; category?: string };
}

export function TipCard({ tip }: TipCardProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const duration = 15000;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        setVisible(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#4A90D9] p-5"
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

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <motion.div
              className="h-full bg-white/40"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
