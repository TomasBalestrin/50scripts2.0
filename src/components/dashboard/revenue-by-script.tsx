'use client';

import { Trophy } from 'lucide-react';

interface ScriptRevenue {
  title: string;
  usageCount: number;
  revenue: number;
  conversionRate: number;
}

interface RevenueByScriptProps {
  scripts: ScriptRevenue[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-300';
  if (rank === 3) return 'text-amber-600';
  return 'text-[#8BA5BD]';
}

function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-yellow-400/10';
  if (rank === 2) return 'bg-gray-300/10';
  if (rank === 3) return 'bg-amber-600/10';
  return 'bg-[#1A3050]';
}

export function RevenueByScript({ scripts }: RevenueByScriptProps) {
  const sorted = [...scripts]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="rounded-xl border border-[#1A3050] bg-[#0F1D32] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Trophy className="h-4 w-4 text-[#C9A84C]" />
        Top Scripts por Receita
      </h3>

      {sorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-[#8BA5BD]">Nenhuma venda registrada ainda</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_70px_100px_70px] items-center gap-2 border-b border-[#1A3050] px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-[#8BA5BD]">
            <span>#</span>
            <span>Script</span>
            <span className="text-right">Usos</span>
            <span className="text-right">Receita</span>
            <span className="text-right">Conv.</span>
          </div>

          {/* Table Rows */}
          {sorted.map((script, index) => {
            const rank = index + 1;
            return (
              <div
                key={script.title}
                className="grid grid-cols-[40px_1fr_70px_100px_70px] items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#1A3050]/50"
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${getRankBg(rank)} ${getRankColor(rank)}`}
                  >
                    {rank}
                  </span>
                </div>

                {/* Title */}
                <span className="truncate text-sm font-medium text-white" title={script.title}>
                  {script.title}
                </span>

                {/* Usage Count */}
                <span className="text-right text-sm text-[#8BA5BD]">
                  {script.usageCount}
                </span>

                {/* Revenue */}
                <span className="text-right text-sm font-semibold text-emerald-400">
                  {formatCurrency(script.revenue)}
                </span>

                {/* Conversion Rate */}
                <span className="text-right text-sm text-[#8BA5BD]">
                  {script.conversionRate.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
