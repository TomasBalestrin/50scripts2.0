'use client';

import { motion } from 'framer-motion';
import {
  ScrollText,
  DollarSign,
  Flame,
  CalendarCheck,
  BookOpen,
  TrendingUp,
  Map,
  Bot,
  Users,
  Lock,
  Award,
} from 'lucide-react';

const BADGE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  first_script: ScrollText,
  first_sale: DollarSign,
  streak_7: Flame,
  streak_30: CalendarCheck,
  scripts_50: BookOpen,
  revenue_10k: TrendingUp,
  all_trails: Map,
  ai_10: Bot,
  referrals_5: Users,
};

interface BadgeItem {
  type: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earned_at?: string;
}

interface BadgeGridProps {
  badges: BadgeItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 15 } as const,
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 18,
    },
  },
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <motion.div
      className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {badges.map((badge) => {
        const Icon = BADGE_ICON_MAP[badge.type] || Award;
        const earned = badge.earned;

        return (
          <motion.div
            key={badge.type}
            variants={itemVariants}
            whileHover={{ scale: earned ? 1.05 : 1.02 }}
            className={`relative flex flex-col items-center rounded-xl border p-3 sm:p-4 transition-colors ${
              earned
                ? 'border-[#C9A84C]/30 bg-[#0F1D32]'
                : 'border-[#1A3050] bg-[#0F1D32]/50'
            }`}
          >
            {/* Badge circle */}
            <div className="relative mb-2">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ${
                  earned ? '' : 'grayscale'
                }`}
                style={
                  earned
                    ? {
                        backgroundColor: '#C9A84C20',
                        boxShadow: '0 0 20px rgba(233,69,96,0.3)',
                        border: '2px solid #C9A84C',
                      }
                    : {
                        backgroundColor: '#1A3050',
                        border: '2px solid #3A3A5C',
                      }
                }
              >
                <Icon
                  className={`h-6 w-6 sm:h-7 sm:w-7 ${
                    earned ? 'text-[#C9A84C]' : 'text-[#4A4A6A]'
                  }`}
                />
              </div>

              {/* Lock overlay for unearned */}
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0A1628]/50">
                  <Lock className="h-4 w-4 text-[#4A4A6A]" />
                </div>
              )}

              {/* Glow animation for earned */}
              {earned && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '1px solid rgba(233,69,96,0.4)',
                  }}
                  animate={{
                    scale: [1, 1.2],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              )}
            </div>

            {/* Name */}
            <p
              className={`text-center text-[11px] font-semibold leading-tight sm:text-xs ${
                earned ? 'text-white' : 'text-[#4A4A6A]'
              }`}
            >
              {badge.name}
            </p>

            {/* Description / requirement */}
            <p
              className={`mt-0.5 text-center text-[9px] leading-tight sm:text-[10px] ${
                earned ? 'text-[#8BA5BD]' : 'text-[#4A4A6A]'
              }`}
            >
              {earned && badge.earned_at
                ? formatDate(badge.earned_at)
                : badge.description}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
