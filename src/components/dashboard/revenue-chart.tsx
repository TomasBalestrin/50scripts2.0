'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{ week: string; revenue: number }>;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-[#131B35] bg-[#0A0F1E] px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[#94A3B8]">{label}</p>
      <p className="text-sm font-bold text-white">
        {payload[0].value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </p>
    </div>
  );
}

// Stable references to avoid re-renders
const CHART_MARGIN = { top: 5, right: 10, left: 0, bottom: 0 };
const AXIS_TICK = { fill: '#94A3B8', fontSize: 12 };
const DOT_STYLE = { fill: '#1D4ED8', strokeWidth: 0, r: 3 };
const ACTIVE_DOT_STYLE = { fill: '#1D4ED8', strokeWidth: 2, stroke: '#fff', r: 5 };

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Receita Semanal</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#1D4ED8" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#131B35"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              tickFormatter={formatCurrency}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1D4ED8"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={DOT_STYLE}
              activeDot={ACTIVE_DOT_STYLE}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
