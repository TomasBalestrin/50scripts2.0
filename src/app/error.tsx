'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/monitoring/sentry';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-[#E94560]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#E94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Algo deu errado</h2>
        <p className="text-gray-400 mb-6">Ocorreu um erro inesperado. Nossa equipe já foi notificada.</p>
        {error.digest && (
          <p className="text-xs text-gray-500 mb-4 font-mono">Código: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="bg-[#E94560] hover:bg-[#d63d56] text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Tentar Novamente
          </button>
          <a href="/" className="border border-gray-600 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors">
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}
