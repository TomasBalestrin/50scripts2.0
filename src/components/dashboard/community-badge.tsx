'use client';

import { Star, Users } from 'lucide-react';

interface CommunityBadgeProps {
  effectiveness: number;
  conversionRate: number;
  usageCount: number;
}

export function CommunityBadge({
  effectiveness,
  conversionRate,
  usageCount,
}: CommunityBadgeProps) {
  if (usageCount < 5) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-full">
        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        <span className="text-yellow-400">{effectiveness.toFixed(1)}</span>
      </div>
      {conversionRate > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-full">
          <Users className="w-3 h-3 text-green-500" />
          <span className="text-green-400">{conversionRate.toFixed(0)}% conv.</span>
        </div>
      )}
    </div>
  );
}
