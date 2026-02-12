'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LockedFeature } from '@/components/shared/locked-feature';
import { StarRating } from '@/components/scripts/star-rating';
import { useAuth } from '@/hooks/use-auth';
import { hasAccess } from '@/lib/plans/gate';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  FileText,
  Lightbulb,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface PatternData {
  period: string;
  stats: {
    total_scripts_used: number;
    total_sales: number;
    total_revenue: number;
    conversion_rate: string;
  };
  top_converting: Array<{
    title: string;
    sale_value: number;
    rating: number;
  }>;
  best_hours: Array<{
    hour: number;
    total: number;
    sales: number;
    conversionRate: number;
  }>;
  insights: string[];
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[#0A0F1E] ${className}`}>
      <div className="p-5">
        <div className="mb-3 h-4 w-1/3 rounded bg-[#131B35]" />
        <div className="h-8 w-1/2 rounded bg-[#131B35]" />
      </div>
    </div>
  );
}

// Custom tooltip for Recharts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#131B35] bg-[#0A0F1E] px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-[#1D4ED8]">
        {payload[0].value.toFixed(1)}% conversao
      </p>
    </div>
  );
}

function PatternsContent() {
  const [data, setData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatterns = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/ai/patterns');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar padroes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="mb-4 h-12 w-12 text-gray-500" />
        <p className="text-gray-400">Nao foi possivel carregar os dados de padroes.</p>
        <Button
          onClick={() => fetchPatterns()}
          className="mt-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Prepare chart data: all 24 hours, filling gaps with 0
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const found = data.best_hours.find((h) => h.hour === i);
    return {
      name: `${i}h`,
      conversao: found ? found.conversionRate : 0,
      total: found ? found.total : 0,
    };
  });

  // Only show hours with activity
  const activeChartData = chartData.filter((d) => d.total > 0);

  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Analise dos ultimos 30 dias
          </h2>
          <p className="text-sm text-gray-400">
            Seus padroes de vendas e conversao
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPatterns(true)}
          disabled={refreshing}
          className="border-[#131B35] bg-[#0A0F1E] text-gray-300 hover:bg-[#131B35] hover:text-white"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar Analise
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {data.stats.total_scripts_used}
              </p>
              <p className="text-xs text-gray-400">Scripts usados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {data.stats.total_sales}
              </p>
              <p className="text-xs text-gray-400">Vendas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                R$ {data.stats.total_revenue.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-gray-400">Receita total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D4ED8]/15">
              <Target className="h-5 w-5 text-[#1D4ED8]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {data.stats.conversion_rate}%
              </p>
              <p className="text-xs text-gray-400">Taxa de conversao</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Hours Chart */}
      {activeChartData.length > 0 && (
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <BarChart3 className="h-4 w-4 text-[#1D4ED8]" />
              Melhores horarios de conversao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#131B35"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#131B35' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#131B35' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="conversao"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {activeChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.conversao > 50 ? '#1D4ED8' : '#3B82F6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Converting Scripts */}
      {data.top_converting.length > 0 && (
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <TrendingUp className="h-4 w-4 text-[#1D4ED8]" />
              Scripts que mais convertem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#131B35]">
                    <th className="pb-3 text-left text-xs font-medium text-gray-400">
                      Script
                    </th>
                    <th className="pb-3 text-right text-xs font-medium text-gray-400">
                      Valor da Venda
                    </th>
                    <th className="pb-3 text-right text-xs font-medium text-gray-400">
                      Avaliacao
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131B35]/50">
                  {data.top_converting.map((script, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm font-medium text-white">
                        {script.title}
                      </td>
                      <td className="py-3 text-right text-sm text-emerald-400">
                        R$ {(script.sale_value ?? 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="flex items-center justify-end py-3">
                        <StarRating
                          value={script.rating ?? 0}
                          readonly
                          size={14}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {data.insights.length > 0 && (
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Lightbulb className="h-4 w-4 text-yellow-400" />
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-[#131B35]/40 px-4 py-3"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1D4ED8]" />
                  <p className="text-sm text-gray-300">{insight}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PatternsPage() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-[#0A0F1E]" />
            <div className="h-4 w-40 rounded bg-[#0A0F1E]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const userPlan = profile?.plan || 'starter';
  const hasPremium = hasAccess(userPlan, 'copilot');

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <BarChart3 className="h-6 w-6 text-[#1D4ED8]" />
              Relatorio de Padroes
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Analise de padroes de vendas com IA
            </p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400">Premium</Badge>
        </div>

        {/* Locked feature gate */}
        {!hasPremium ? (
          <LockedFeature requiredPlan="premium" userPlan={userPlan}>
            <PatternsContent />
          </LockedFeature>
        ) : (
          <PatternsContent />
        )}
      </div>
    </div>
  );
}
