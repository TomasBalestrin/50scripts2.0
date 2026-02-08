'use client';

import { cn } from '@/lib/utils';

interface Trail {
  name: string;
  icon: string;
  used: number;
  total: number;
  color: string;
}

interface TrailProgressProps {
  trails: Trail[];
}

export function TrailProgress({ trails }: TrailProgressProps) {
  return (
    <div className="space-y-4">
      {trails.map((trail) => {
        const percentage = trail.total > 0 ? Math.round((trail.used / trail.total) * 100) : 0;
        return (
          <div key={trail.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-white">
                <span>{trail.icon}</span>
                <span>{trail.name}</span>
              </span>
              <span className="text-[#8BA5BD]">
                {trail.used}/{trail.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1A3050]">
              <div
                className={cn('h-full rounded-full transition-all duration-500')}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: trail.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
