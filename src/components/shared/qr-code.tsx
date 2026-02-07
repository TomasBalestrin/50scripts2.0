'use client';

import { useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [error, setError] = useState(false);

  if (!value || error) {
    // Fallback: show a simple placeholder
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-[#252542] bg-white ${className || ''}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400 text-center px-4">
          QR Code indisponivel
        </span>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=FFFFFF&color=1A1A2E&margin=8`;

  return (
    <img
      src={qrUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded-lg ${className || ''}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
