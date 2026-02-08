'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueCardProps {
  totalRevenue: number;
  previousRevenue: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function RevenueCard({ totalRevenue, previousRevenue }: RevenueCardProps) {
  const difference = totalRevenue - previousRevenue;
  const percentChange = previousRevenue > 0
    ? ((difference / previousRevenue) * 100).toFixed(1)
    : totalRevenue > 0
      ? '100'
      : '0';
  const isPositive = difference >= 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1A3050] bg-[#0F1D32] p-6">
      {/* Gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C9A84C] to-[#4A90D9]" />

      <div className="mb-1 text-sm font-medium text-[#8BA5BD]">Receita Total</div>

      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {formatCurrency(totalRevenue)}
        </span>

        <div
          className={`mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isPositive
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{isPositive ? '+' : ''}{percentChange}%</span>
        </div>
      </div>

      <p className="mt-2 text-sm text-[#8BA5BD]">
        Seus scripts geraram este valor
      </p>

      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-[#C9A84C]/5" />
    </div>
  );
}
