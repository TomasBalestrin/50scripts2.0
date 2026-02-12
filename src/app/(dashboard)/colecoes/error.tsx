'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Algo deu errado</h2>
      <p className="text-sm text-[#94A3B8] max-w-md mb-6">
        Ocorreu um erro inesperado. Tente novamente ou volte para o início.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8]/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 rounded-lg border border-[#131B35] bg-[#0A0F1E] px-5 py-2.5 text-sm font-medium text-[#94A3B8] hover:text-white transition-colors"
        >
          <Home className="h-4 w-4" />
          Início
        </button>
      </div>
    </div>
  );
}
