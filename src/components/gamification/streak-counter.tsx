'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
  current: number;
  longest: number;
}

export function StreakCounter({ current, longest }: StreakCounterProps) {
  const isActive = current > 0;
  const isHot = current >= 7;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Flame + count */}
      <div className="relative flex items-center gap-2">
        {/* Fire glow background when active */}
        {isActive && (
          <motion.div
            className="absolute -inset-3 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <motion.div
          className="relative"
          animate={
            isActive
              ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Flame
            className={`h-8 w-8 ${
              isActive
                ? isHot
                  ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                  : 'text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]'
                : 'text-[#4A4A6A]'
            }`}
          />

          {/* Extra flame particles when hot */}
          {isHot && (
            <>
              <motion.div
                className="absolute -top-1 left-1 h-2 w-2 rounded-full bg-yellow-400"
                animate={{
                  y: [-2, -10],
                  x: [-2, -4],
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              <motion.div
                className="absolute -top-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-300"
                animate={{
                  y: [-2, -12],
                  x: [2, 5],
                  opacity: [0.7, 0],
                  scale: [1, 0.2],
                }}
                transition={{
                  duration: 1.3,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.3,
                }}
              />
            </>
          )}
        </motion.div>

        <motion.span
          className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-[#4A4A6A]'}`}
          key={current}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {current}
        </motion.span>
      </div>

      {/* Subtitle */}
      <p className={`text-sm font-medium ${isActive ? 'text-orange-300/80' : 'text-[#4A4A6A]'}`}>
        {current === 1 ? '1 dia seguido' : `${current} dias seguidos`}
      </p>

      {/* Longest streak */}
      <p className="text-[10px] text-[#8BA5BD]">
        Recorde: {longest} {longest === 1 ? 'dia' : 'dias'}
      </p>
    </div>
  );
}
