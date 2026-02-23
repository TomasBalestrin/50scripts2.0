'use client';

import { motion } from 'framer-motion';
import { Lock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Script } from '@/types/database';

interface ScriptCardProps {
  script: Script;
  locked?: boolean;
  hasSale?: boolean;
  onClick?: () => void;
}

export function ScriptCard({ script, locked = false, hasSale = false, onClick }: ScriptCardProps) {
  const preview = script.content.length > 80
    ? script.content.slice(0, 80) + '...'
    : script.content;

  return (
    <motion.div
      whileHover={{ scale: locked ? 1 : 1.02 }}
      whileTap={{ scale: locked ? 1 : 0.98 }}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-label={`Script: ${script.title}${locked ? ' (Premium - bloqueado)' : ''}`}
      aria-disabled={locked}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 transition-colors hover:border-[#1D4ED8]/30 focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:outline-none',
        locked && 'cursor-not-allowed',
        hasSale && 'border-[#10B981]/40'
      )}
      onClick={() => {
        if (!locked && onClick) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!locked && onClick) onClick();
        }
      }}
    >
      {/* Sale indicator */}
      {hasSale && !locked && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#10B981]/20 px-2 py-0.5">
          <DollarSign className="h-3 w-3 text-[#10B981]" />
          <span className="text-[10px] font-semibold text-[#10B981]">Venda</span>
        </div>
      )}

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm bg-[#020617]/60">
          <Lock className="h-6 w-6 text-[#1D4ED8]" />
          <span className="rounded-full bg-[#1D4ED8] px-3 py-1 text-xs font-bold text-white">
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
              aria-label={`Categoria: ${script.category.name}`}
            />
          )}
        </div>

        {/* Preview */}
        <p className="mb-3 text-xs leading-relaxed text-[#94A3B8]">{preview}</p>

        {/* Tags */}
        {script.tags && script.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {script.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#131B35] px-2 py-0.5 text-[10px] text-[#94A3B8]"
              >
                {tag}
              </span>
            ))}
            {script.tags.length > 3 && (
              <span className="text-[10px] text-[#94A3B8]">+{script.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Usage count */}
        <p className="text-[10px] text-[#94A3B8]">
          {script.global_usage_count} {script.global_usage_count === 1 ? 'uso' : 'usos'}
        </p>
      </div>
    </motion.div>
  );
}
