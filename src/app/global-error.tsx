'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/monitoring/sentry';

export default function GlobalError({
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
    <html>
      <body className="bg-[#0F0F1A] text-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-[#E94560] mb-4">Ops!</h1>
          <p className="text-gray-400 mb-6">Algo deu errado. Nosso time já foi notificado.</p>
          <button
            onClick={reset}
            className="bg-[#E94560] hover:bg-[#d63d56] text-white px-6 py-3 rounded-lg font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}
