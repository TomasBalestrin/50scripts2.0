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
      <body className="bg-[#0A1628] text-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-[#C9A84C] mb-4">Ops!</h1>
          <p className="text-gray-400 mb-6">Algo deu errado. Nosso time já foi notificado.</p>
          <button
            onClick={reset}
            className="bg-[#C9A84C] hover:bg-[#d63d56] text-white px-6 py-3 rounded-lg font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}
