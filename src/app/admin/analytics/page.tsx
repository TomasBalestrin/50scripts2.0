'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Activity,
  Loader2,
  TrendingUp,
  Monitor,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  avg_session_minutes: number;
  total_users: number;
  active_users: number;
  dau_trend: { date: string; count: number }[];
  logins_trend: { date: string; logins: number }[];
  top_pages: { path: string; label: string; views: number }[];
  peak_hours: { hour: string; count: number }[];
  feature_usage: { feature: string; count: number }[];
  engagement: { high: number; medium: number; low: number };
  top_users: { id: string; name: string; plan: string; events: number }[];
  tone_preference: { tone: string; count: number }[];
  script_stats: { total_uses: number; sales: number; conversion_rate: number };
}

const FEATURE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];
const ENGAGEMENT_COLORS = ['#10B981', '#F59E0B', '#EF4444'];
const PLAN_COLORS: Record<string, string> = {
  starter: '#6B7280',
  pro: '#3B82F6',
  premium: '#8B5CF6',
  copilot: '#F59E0B',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${period}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-400">
        Erro ao carregar dados de analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics & Usabilidade</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                period === d
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-[#131B35] text-gray-400 hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="DAU (Hoje)"
          value={data.dau.toString()}
          subtitle={`de ${data.total_users} total`}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="WAU (7 dias)"
          value={data.wau.toString()}
          subtitle={`${data.total_users > 0 ? Math.round((data.wau / data.total_users) * 100) : 0}% dos usuários`}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="MAU (30 dias)"
          value={data.mau.toString()}
          subtitle={`${data.total_users > 0 ? Math.round((data.mau / data.total_users) * 100) : 0}% dos usuários`}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Tempo Médio Sessão"
          value={data.avg_session_minutes > 0 ? `${data.avg_session_minutes} min` : '-'}
          subtitle="por sessão/dia"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Script Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Usos de Scripts"
          value={data.script_stats.total_uses.toString()}
          subtitle={`no período de ${period} dias`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Vendas via Scripts"
          value={data.script_stats.sales.toString()}
          subtitle={`de ${data.script_stats.total_uses} usos`}
          icon={<Target className="h-5 w-5" />}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${data.script_stats.conversion_rate}%`}
          subtitle="scripts que geraram venda"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      {/* DAU Trend + Peak Hours */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Usuários Ativos Diários ({period} dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dau_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#131B35" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(val: string) => val.slice(5)}
                  />
                  <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0F1E',
                      border: '1px solid #131B35',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    labelFormatter={(label) =>
                      new Date(String(label)).toLocaleDateString('pt-BR')
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1D4ED8"
                    strokeWidth={2}
                    dot={false}
                    name="Usuários ativos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Horários de Pico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.peak_hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#131B35" />
                  <XAxis
                    dataKey="hour"
                    stroke="#6B7280"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A0F1E',
                      border: '1px solid #131B35',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#1D4ED8" radius={[4, 4, 0, 0]} name="Acessos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage + Engagement + Top Pages */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Feature Usage */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Uso de Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.feature_usage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.feature_usage}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="feature"
                      label={({ name, value }: { name?: string; value?: number }) =>
                        `${name}: ${value}`
                      }
                    >
                      {data.feature_usage.map((_, i) => (
                        <Cell key={i} fill={FEATURE_COLORS[i % FEATURE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0F1E',
                        border: '1px solid #131B35',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados de uso ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Engagement Tiers */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {(data.engagement.high + data.engagement.medium + data.engagement.low) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Alto (50+ eventos)', value: data.engagement.high },
                        { name: 'Médio (10-49)', value: data.engagement.medium },
                        { name: 'Baixo (1-9)', value: data.engagement.low },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }: { name?: string; value?: number }) =>
                        `${value}`
                      }
                    >
                      {[data.engagement.high, data.engagement.medium, data.engagement.low]
                        .map((val, i) => val > 0 ? <Cell key={i} fill={ENGAGEMENT_COLORS[i]} /> : null)
                        .filter(Boolean)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0F1E',
                        border: '1px solid #131B35',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-300">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados de engajamento
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Monitor className="h-4 w-4" />
              Páginas Mais Visitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_pages.length > 0 ? (
                data.top_pages.slice(0, 8).map((page, i) => {
                  const maxViews = data.top_pages[0]?.views || 1;
                  const pct = Math.round((page.views / maxViews) * 100);
                  return (
                    <div key={page.path} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          <span className="mr-2 text-gray-600">{i + 1}.</span>
                          {page.label}
                        </span>
                        <span className="font-medium text-white">{page.views}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#131B35]">
                        <div
                          className="h-1.5 rounded-full bg-[#1D4ED8]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-48 items-center justify-center text-gray-500">
                  Sem dados de navegação
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table + Tone Preference */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Users */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <TrendingUp className="h-4 w-4" />
              Usuários Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Usuário</th>
                    <th className="pb-3 pr-4">Plano</th>
                    <th className="pb-3 text-right">Eventos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_users.map((user, i) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#131B35]/50 text-white"
                    >
                      <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{user.name}</td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: `${PLAN_COLORS[user.plan] || '#6B7280'}20`,
                            color: PLAN_COLORS[user.plan] || '#6B7280',
                            borderColor: `${PLAN_COLORS[user.plan] || '#6B7280'}40`,
                          }}
                        >
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">{user.events}</td>
                    </tr>
                  ))}
                  {data.top_users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        Sem dados de atividade ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tone Preference */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Preferência de Tom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.tone_preference.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tone_preference} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#131B35" />
                    <XAxis type="number" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="tone"
                      stroke="#6B7280"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0F1E',
                        border: '1px solid #131B35',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Usos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados de tom ainda
                </div>
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
    <Card className="border-[#131B35] bg-[#0A0F1E]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
