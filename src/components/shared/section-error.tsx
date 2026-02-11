'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SectionErrorProps {
  section?: string;
  onRetry?: () => void;
}

export function SectionError({ section = 'esta seção', onRetry }: SectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-red-300">Erro ao carregar {section}</p>
      <p className="mt-1 text-xs text-[#94A3B8]">Tente novamente ou volte mais tarde</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
