'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Script } from '@/types/database';
import { StarRating } from '@/components/scripts/star-rating';

interface ScriptCardProps {
  script: Script;
  locked?: boolean;
  onClick?: () => void;
}

export function ScriptCard({ script, locked = false, onClick }: ScriptCardProps) {
  const preview = script.content.length > 80
    ? script.content.slice(0, 80) + '...'
    : script.content;

  return (
    <motion.div
      whileHover={{ scale: locked ? 1 : 1.02 }}
      whileTap={{ scale: locked ? 1 : 0.98 }}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border border-[#1A3050] bg-[#0F1D32] p-5 transition-colors hover:border-[#C9A84C]/30',
        locked && 'cursor-not-allowed'
      )}
      onClick={() => {
        if (!locked && onClick) onClick();
      }}
    >
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm bg-[#0A1628]/60">
          <Lock className="h-6 w-6 text-[#C9A84C]" />
          <span className="rounded-full bg-[#C9A84C] px-3 py-1 text-xs font-bold text-white">
            Premium
          </span>
        </div>
      )}

      <div className={cn(locked && 'blur-[2px]')}>
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white line-clamp-2">{script.title}</h3>
          {script.category && (
            <span
              className="shrink-0 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: script.category.color }}
              title={script.category.name}
            />
          )}
        </div>

        {/* Preview */}
        <p className="mb-3 text-xs leading-relaxed text-[#8BA5BD]">{preview}</p>

        {/* Effectiveness */}
        <div className="mb-3">
          <StarRating value={Math.round(script.global_effectiveness)} readonly size={14} />
        </div>

        {/* Tags */}
        {script.tags && script.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {script.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#1A3050] px-2 py-0.5 text-[10px] text-[#8BA5BD]"
              >
                {tag}
              </span>
            ))}
            {script.tags.length > 3 && (
              <span className="text-[10px] text-[#8BA5BD]">+{script.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Usage count */}
        <p className="text-[10px] text-[#8BA5BD]">
          {script.global_usage_count} {script.global_usage_count === 1 ? 'uso' : 'usos'}
        </p>
      </div>
    </motion.div>
  );
}
