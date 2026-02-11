'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#131B35] mb-4">
        <Icon className="h-8 w-8 text-[#94A3B8]" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-[#94A3B8] max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-3 bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg hover:bg-[#1D4ED8]/90 active:scale-[0.97] transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
