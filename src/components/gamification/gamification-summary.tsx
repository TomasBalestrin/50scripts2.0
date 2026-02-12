'use client';

import Link from 'next/link';
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
  ChevronRight,
} from 'lucide-react';
import { XpBar } from './xp-bar';

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

interface BadgeSummary {
  type: string;
  name: string;
  earned: boolean;
}

interface GamificationSummaryProps {
  xp: number;
  level: string;
  currentStreak: number;
  longestStreak: number;
  badges: BadgeSummary[];
}

export function GamificationSummary({
  xp,
  level,
  currentStreak,
  longestStreak,
  badges,
}: GamificationSummaryProps) {
  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length;
  const completionPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  const isStreakActive = currentStreak > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Award className="h-4 w-4 text-[#1D4ED8]" />
          Conquistas
        </h3>
        <Link
          href="/badges"
          className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
        >
          Ver tudo
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* XP Bar + Streak row */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <XpBar xp={xp} level={level} />
        </div>
        <div className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#131B35]/50 px-3 py-2">
          <Flame
            className={`h-4 w-4 ${
              isStreakActive
                ? 'text-orange-400 drop-shadow-[0_0_4px_rgba(249,115,22,0.6)]'
                : 'text-[#475569]'
            }`}
          />
          <div className="text-center">
            <p className={`text-sm font-bold leading-none ${isStreakActive ? 'text-white' : 'text-[#475569]'}`}>
              {currentStreak}
            </p>
            <p className="text-[9px] text-[#94A3B8] leading-none mt-0.5">dias</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between rounded-lg bg-[#131B35]/50 px-4 py-2.5">
        <div className="text-center">
          <p className="text-sm font-bold text-white">{xp}</p>
          <p className="text-[9px] text-[#94A3B8]">XP Total</p>
        </div>
        <div className="h-6 w-px bg-[#1E2A52]" />
        <div className="text-center">
          <p className="text-sm font-bold text-white">{earnedCount}/{totalCount}</p>
          <p className="text-[9px] text-[#94A3B8]">Badges</p>
        </div>
        <div className="h-6 w-px bg-[#1E2A52]" />
        <div className="text-center">
          <p className="text-sm font-bold text-white">{completionPct}%</p>
          <p className="text-[9px] text-[#94A3B8]">Completo</p>
        </div>
        <div className="h-6 w-px bg-[#1E2A52]" />
        <div className="text-center">
          <p className="text-sm font-bold text-white">{longestStreak}</p>
          <p className="text-[9px] text-[#94A3B8]">Recorde</p>
        </div>
      </div>

      {/* Mini badge icons row */}
      <div className="flex items-center gap-2 flex-wrap">
        {badges.map((badge) => {
          const Icon = BADGE_ICON_MAP[badge.type] || Award;
          return (
            <div
              key={badge.type}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
                badge.earned
                  ? 'bg-[#1D4ED8]/20 border border-[#1D4ED8]/40'
                  : 'bg-[#131B35] border border-[#1E2A52]'
              }`}
              title={badge.name}
            >
              <Icon
                className={`h-4 w-4 ${
                  badge.earned ? 'text-[#1D4ED8]' : 'text-[#475569]'
                }`}
              />
              {!badge.earned && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#020617]/40">
                  <Lock className="h-2.5 w-2.5 text-[#475569]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
