'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingDown,
  Activity,
  Bot,
  Zap,
  Coins,
  Webhook,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardData {
  total_users: number;
  total_users_by_plan: Record<string, number>;
  active_count: number;
  mrr: number;
  churn_percent: number;
  dau: number;
  mau: number;
  dau_mau_ratio: number;
  user_growth: { date: string; count: number }[];
  users_by_plan_chart: { name: string; value: number }[];
  mrr_trend: { date: string; mrr: number }[];
  top_scripts: {
    id: string;
    title: string;
    category: string | null;
    usage_count: number;
    avg_effectiveness: number;
  }[];
  ai_consumption: {
    total_generations: number;
    total_tokens: number;
    estimated_cost: number;
  };
  recent_webhooks: {
    id: string;
    source: string;
    event_type: string;
    email: string;
    status: string;
    error_message: string | null;
    processed_at: string;
  }[];
}

const PIE_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        Erro ao carregar dados do dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Usuários"
          value={data.total_users.toString()}
          subtitle={`Starter: ${data.total_users_by_plan.starter} | Pro: ${data.total_users_by_plan.pro} | Premium: ${data.total_users_by_plan.premium} | Copilot: ${data.total_users_by_plan.copilot}`}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="MRR"
          value={`R$ ${data.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${data.active_count} assinantes ativos`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Churn"
          value={`${data.churn_percent}%`}
          subtitle={`${data.total_users - data.active_count} inativos`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <MetricCard
          title="DAU / MAU"
          value={`${data.dau} / ${data.mau}`}
          subtitle={`Ratio: ${data.dau_mau_ratio}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <Card className="border-[#1A3050] bg-[#0F1D32]">
          <CardHeader>
            <CardTitle className="text-base text-white">Crescimento de Usuários (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.user_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A3050" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(val: string) => val.slice(5)}
                  />
                  <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1D32',
                      border: '1px solid #1A3050',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={false}
                    name="Novos usuários"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users by Plan */}
        <Card className="border-[#1A3050] bg-[#0F1D32]">
          <CardHeader>
            <CardTitle className="text-base text-white">Usuários por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.users_by_plan_chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }: { name?: string; value?: number }) =>
                      `${name}: ${value}`
                    }
                  >
                    {data.users_by_plan_chart.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1D32',
                      border: '1px solid #1A3050',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-sm text-gray-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MRR Trend */}
        <Card className="border-[#1A3050] bg-[#0F1D32] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">Tendência MRR (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.mrr_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A3050" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1D32',
                      border: '1px solid #1A3050',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    formatter={(value: unknown) => [
                      `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'MRR',
                    ]}
                  />
                  <defs>
                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    fill="url(#mrrGradient)"
                    name="MRR"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Scripts Table */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader>
          <CardTitle className="text-base text-white">Top 10 Scripts por Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A3050] text-left text-gray-400">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Título</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4 text-right">Usos</th>
                  <th className="pb-3 text-right">Efetividade</th>
                </tr>
              </thead>
              <tbody>
                {data.top_scripts.map((script, i) => (
                  <tr
                    key={script.id}
                    className="border-b border-[#1A3050]/50 text-white"
                  >
                    <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium">{script.title}</td>
                    <td className="py-2.5 pr-4 text-gray-400">
                      {script.category || '-'}
                    </td>
                    <td className="py-2.5 pr-4 text-right">{script.usage_count}</td>
                    <td className="py-2.5 text-right">
                      {script.avg_effectiveness
                        ? `${(script.avg_effectiveness * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                  </tr>
                ))}
                {data.top_scripts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Nenhum script com uso registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: AI Consumption + Recent Webhooks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Consumption */}
        <Card className="border-[#1A3050] bg-[#0F1D32]">
          <CardHeader>
            <CardTitle className="text-base text-white">Consumo de IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#1A3050] p-4 text-center">
                <Bot className="mx-auto mb-2 h-6 w-6 text-[#C9A84C]" />
                <p className="text-2xl font-bold text-white">
                  {data.ai_consumption.total_generations}
                </p>
                <p className="text-xs text-gray-400">Gerações</p>
              </div>
              <div className="rounded-lg bg-[#1A3050] p-4 text-center">
                <Zap className="mx-auto mb-2 h-6 w-6 text-[#C9A84C]" />
                <p className="text-2xl font-bold text-white">
                  {data.ai_consumption.total_tokens.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-400">Tokens</p>
              </div>
              <div className="rounded-lg bg-[#1A3050] p-4 text-center">
                <Coins className="mx-auto mb-2 h-6 w-6 text-[#C9A84C]" />
                <p className="text-2xl font-bold text-white">
                  ${data.ai_consumption.estimated_cost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Custo Est.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Webhooks */}
        <Card className="border-[#1A3050] bg-[#0F1D32]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white">
              Webhooks Recentes
            </CardTitle>
            <Webhook className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent_webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between rounded-lg bg-[#1A3050] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        wh.status === 'success'
                          ? 'border-green-800 bg-green-900/30 text-green-400'
                          : 'border-red-800 bg-red-900/30 text-red-400'
                      }
                    >
                      {wh.status === 'success' ? 'OK' : 'Erro'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {wh.source} - {wh.event_type}
                      </p>
                      <p className="text-xs text-gray-400">{wh.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(wh.processed_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
              {data.recent_webhooks.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  Nenhum webhook registrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-[#1A3050] bg-[#0F1D32]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]/10 text-[#C9A84C]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
