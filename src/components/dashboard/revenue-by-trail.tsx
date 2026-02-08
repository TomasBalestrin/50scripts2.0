'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TrailRevenueItem {
  name: string;
  revenue: number;
  color: string;
}

interface RevenueByTrailProps {
  data: TrailRevenueItem[];
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: TrailRevenueItem }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#1A3050] bg-[#0F1D32] px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[#8BA5BD]">{item.name}</p>
      <p className="text-sm font-bold text-white">
        {item.revenue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </p>
    </div>
  );
}

export function RevenueByTrail({ data }: RevenueByTrailProps) {
  return (
    <div className="rounded-xl border border-[#1A3050] bg-[#0F1D32] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Receita por Trilha</h3>

      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-[#8BA5BD]">Nenhum dado de receita ainda</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1A3050"
                horizontal={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8BA5BD', fontSize: 11 }}
                tickFormatter={formatCurrency}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8BA5BD', fontSize: 11 }}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1A3050' }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
