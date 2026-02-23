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
  UserPlus,
  ClipboardCheck,
  FileText,
  Sparkles,
  DollarSign,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  total_users: number;
  active_users: number;
  new_signups: number;
  avg_session_minutes: number;
  onboarding_completed: number;
  onboarding_rate: number;
  users_who_logged_in: number;
  scripts_used: number;
  personalized_generated: number;
  total_sales: number;
  total_revenue: number;
  dau_trend: { date: string; count: number }[];
  top_pages: { path: string; label: string; views: number }[];
  peak_hours: { hour: string; count: number }[];
  feature_usage: { feature: string; count: number }[];
  engagement: { high: number; medium: number; low: number };
  level_distribution: { level: string; count: number }[];
  top_users: {
    id: string;
    name: string;
    email: string;
    level: string;
    active_days: number;
    events: number;
    last_seen: string;
  }[];
  recent_users: {
    id: string;
    name: string;
    email: string;
    last_seen: string;
    last_action: string;
  }[];
}

const MODULE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];
const ENGAGEMENT_COLORS = ['#10B981', '#F59E0B', '#EF4444'];
const LEVEL_COLORS: Record<string, string> = {
  iniciante: '#6B7280',
  aprendiz: '#3B82F6',
  executor: '#8B5CF6',
  estrategista: '#F59E0B',
  especialista: '#EF4444',
  referencia: '#EC4899',
  lenda: '#FFD700',
};

function formatTimeAgo(isoStr: string): string {
  if (!isoStr) return '-';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Usabilidade</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data.total_users} usuários cadastrados | {data.active_users} ativos
          </p>
        </div>
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

      {/* Row 1: User Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ativos Hoje"
          value={data.dau.toString()}
          subtitle={`de ${data.total_users} total`}
          icon={<Users className="h-5 w-5" />}
          color="#1D4ED8"
        />
        <MetricCard
          title="Ativos 7 dias"
          value={data.wau.toString()}
          subtitle={`${data.total_users > 0 ? Math.round((data.wau / data.total_users) * 100) : 0}% dos usuários`}
          icon={<Calendar className="h-5 w-5" />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Ativos 30 dias"
          value={data.mau.toString()}
          subtitle={`${data.total_users > 0 ? Math.round((data.mau / data.total_users) * 100) : 0}% dos usuários`}
          icon={<Activity className="h-5 w-5" />}
          color="#10B981"
        />
        <MetricCard
          title="Sessão Média"
          value={data.avg_session_minutes > 0 ? `${data.avg_session_minutes}min` : '-'}
          subtitle="por sessão/dia"
          icon={<Clock className="h-5 w-5" />}
          color="#F59E0B"
        />
      </div>

      {/* Row 2: Growth + Feature Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Novos Cadastros"
          value={data.new_signups.toString()}
          subtitle={`últimos ${period} dias`}
          icon={<UserPlus className="h-5 w-5" />}
          color="#3B82F6"
        />
        <MetricCard
          title="Onboarding"
          value={`${data.onboarding_rate}%`}
          subtitle={`${data.onboarding_completed} de ${data.users_who_logged_in} que logaram`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Scripts Usados"
          value={data.scripts_used.toString()}
          subtitle={`no período`}
          icon={<FileText className="h-5 w-5" />}
          color="#10B981"
        />
        <MetricCard
          title="Personalizados"
          value={data.personalized_generated.toString()}
          subtitle="gerados com IA"
          icon={<Sparkles className="h-5 w-5" />}
          color="#F59E0B"
        />
        <MetricCard
          title="Vendas"
          value={data.total_sales.toString()}
          subtitle={formatCurrency(data.total_revenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="#EF4444"
        />
      </div>

      {/* Charts Row 1: DAU Trend + Peak Hours */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Usuários Ativos por Dia ({period}d)
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

      {/* Charts Row 2: Module Usage + Engagement + Level Distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Module Usage */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Uso por Módulo</CardTitle>
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
                        <Cell key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} />
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

        {/* Engagement Tiers */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Engajamento (30d)</CardTitle>
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
                      label={({ value }: { value?: number }) => `${value}`}
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

        {/* Level Distribution */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="text-base text-white">Distribuição de Níveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.level_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.level_distribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#131B35" />
                    <XAxis type="number" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="level"
                      stroke="#6B7280"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      width={85}
                      tickFormatter={(val: string) => val.charAt(0).toUpperCase() + val.slice(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0F1E',
                        border: '1px solid #131B35',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                      formatter={(value) => [value, 'Usuários']}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Usuários">
                      {data.level_distribution.map((entry, i) => (
                        <Cell key={i} fill={LEVEL_COLORS[entry.level] || '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados de nível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Monitor className="h-4 w-4" />
            Páginas Mais Visitadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.top_pages.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.top_pages.slice(0, 10).map((page, i) => {
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
              })}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-gray-500">
              Sem dados de navegação ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables: Recent Users + Top Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Active Users */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Eye className="h-4 w-4" />
              Últimos Acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="pb-3 pr-4">Usuário</th>
                    <th className="pb-3 pr-4">Última Ação</th>
                    <th className="pb-3 text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#131B35]/50"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300">{user.last_action}</td>
                      <td className="py-2.5 text-right text-gray-400">
                        {formatTimeAgo(user.last_seen)}
                      </td>
                    </tr>
                  ))}
                  {data.recent_users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        Sem atividade recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
                    <th className="pb-3 pr-4">Nível</th>
                    <th className="pb-3 pr-4 text-right">Dias</th>
                    <th className="pb-3 text-right">Eventos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_users.map((user, i) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#131B35]/50"
                    >
                      <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${LEVEL_COLORS[user.level] || '#6B7280'}20`,
                            color: LEVEL_COLORS[user.level] || '#6B7280',
                          }}
                        >
                          {user.level.charAt(0).toUpperCase() + user.level.slice(1)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-300">{user.active_days}</td>
                      <td className="py-2.5 text-right text-white">{user.events}</td>
                    </tr>
                  ))}
                  {data.top_users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Sem dados de atividade ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
  color = '#1D4ED8',
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className="border-[#131B35] bg-[#0A0F1E]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="truncate text-xs text-gray-500">{subtitle}</p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
