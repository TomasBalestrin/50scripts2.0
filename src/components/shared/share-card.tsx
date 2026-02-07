'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareCardProps {
  userName: string;
  saleValue: number;
  scriptTitle: string;
  referralCode?: string;
  onExport?: () => void;
}

export function ShareCard({
  userName,
  saleValue,
  scriptTitle,
  referralCode,
  onExport,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const formattedValue = saleValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `venda-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      onExport?.();
    } catch (err) {
      console.error('Erro ao exportar imagem:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Visual Card */}
      <div
        ref={cardRef}
        className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl"
        style={{
          width: 350,
          height: 600,
          background: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #E94560 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #0F3460 0%, transparent 70%)' }}
        />

        {/* Top branding */}
        <div className="relative z-10 flex w-full flex-col items-center pt-10">
          <div className="mb-1 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#E94560]" />
            <span
              className="text-lg font-bold tracking-wider"
              style={{ color: '#E94560' }}
            >
              50 Scripts 2.0
            </span>
          </div>
          <div
            className="h-0.5 w-16 rounded-full"
            style={{ backgroundColor: '#E94560' }}
          />
        </div>

        {/* Center celebration */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-400">
            Venda fechada!
          </p>
          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-lg font-medium text-gray-400">R$</span>
            <span
              className="text-5xl font-extrabold"
              style={{ color: '#E94560' }}
            >
              {formattedValue}
            </span>
          </div>

          {/* Divider */}
          <div className="mb-4 h-px w-3/4 bg-[#252542]" />

          {/* Script title */}
          <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
            Script utilizado
          </p>
          <p className="mb-6 max-w-[280px] text-center text-sm font-semibold text-white">
            {scriptTitle}
          </p>

          {/* User name */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: '#E94560' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-300">{userName}</span>
          </div>
        </div>

        {/* Bottom referral code */}
        <div className="relative z-10 w-full px-6 pb-8">
          {referralCode && (
            <div
              className="rounded-xl border px-4 py-3 text-center"
              style={{
                borderColor: '#E94560',
                backgroundColor: 'rgba(233, 69, 96, 0.08)',
              }}
            >
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                Use meu codigo
              </p>
              <p
                className="text-lg font-bold tracking-widest"
                style={{ color: '#E94560' }}
              >
                {referralCode}
              </p>
            </div>
          )}
          {!referralCode && (
            <div className="text-center">
              <p className="text-xs text-gray-500">50scripts.com.br</p>
            </div>
          )}
        </div>
      </div>

      {/* Export button */}
      <Button
        onClick={handleExport}
        disabled={exporting}
        className="w-full max-w-[350px] bg-[#E94560] hover:bg-[#d63d56] text-white h-11"
      >
        {exporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exportar como Imagem
          </>
        )}
      </Button>
    </div>
  );
}
