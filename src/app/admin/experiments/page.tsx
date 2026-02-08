'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  FlaskConical,
  Loader2,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

interface ExperimentRow {
  flag: FeatureFlag;
  controlCount: number;
  treatmentCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentRow | null>(null);
  const [editingPercentage, setEditingPercentage] = useState<Record<string, number>>({});
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const supabase = createClient();

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get all flags
      const { data: flags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (flagsError || !flags) {
        console.error('Erro ao buscar flags:', flagsError);
        setExperiments([]);
        return;
      }

      // 2. Get all assignments in one query
      const { data: allAssignments } = await supabase
        .from('user_feature_assignments')
        .select('feature_flag_id, variant');

      // 3. Count assignments per flag
      const countMap = new Map<string, { control: number; treatment: number }>();
      if (allAssignments) {
        for (const a of allAssignments) {
          const existing = countMap.get(a.feature_flag_id) || { control: 0, treatment: 0 };
          if (a.variant === 'treatment') {
            existing.treatment += 1;
          } else {
            existing.control += 1;
          }
          countMap.set(a.feature_flag_id, existing);
        }
      }

      // 4. Build experiment rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: ExperimentRow[] = flags.map((flag: any) => {
        const counts = countMap.get(flag.id) || { control: 0, treatment: 0 };
        return {
          flag,
          controlCount: counts.control,
          treatmentCount: counts.treatment,
        };
      });

      setExperiments(rows);

      // Initialize editing percentages
      const percentages: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flags.forEach((f: any) => {
        percentages[f.id] = f.rollout_percentage;
      });
      setEditingPercentage(percentages);
    } catch (err) {
      console.error('Erro ao buscar experimentos:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleToggleEnabled(flagId: string, currentEnabled: boolean) {
    setActionLoading(flagId);
    try {
      await supabase
        .from('feature_flags')
        .update({
          enabled: !currentEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flagId);

      setExperiments((prev) =>
        prev.map((e) =>
          e.flag.id === flagId
            ? { ...e, flag: { ...e.flag, enabled: !currentEnabled } }
            : e
        )
      );

      if (selectedExperiment?.flag.id === flagId) {
        setSelectedExperiment((prev) =>
          prev ? { ...prev, flag: { ...prev.flag, enabled: !currentEnabled } } : null
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdatePercentage(flagId: string) {
    const newPercentage = editingPercentage[flagId];
    if (newPercentage === undefined) return;

    setActionLoading(flagId);
    try {
      const clamped = Math.max(0, Math.min(100, Math.round(newPercentage)));
      await supabase
        .from('feature_flags')
        .update({
          rollout_percentage: clamped,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flagId);

      setExperiments((prev) =>
        prev.map((e) =>
          e.flag.id === flagId
            ? { ...e, flag: { ...e.flag, rollout_percentage: clamped } }
            : e
        )
      );

      setEditingPercentage((prev) => ({ ...prev, [flagId]: clamped }));

      if (selectedExperiment?.flag.id === flagId) {
        setSelectedExperiment((prev) =>
          prev
            ? { ...prev, flag: { ...prev.flag, rollout_percentage: clamped } }
            : null
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetAssignments(flagId: string) {
    setActionLoading(flagId);
    try {
      await supabase
        .from('user_feature_assignments')
        .delete()
        .eq('feature_flag_id', flagId);

      // Update local counts
      setExperiments((prev) =>
        prev.map((e) =>
          e.flag.id === flagId
            ? { ...e, controlCount: 0, treatmentCount: 0 }
            : e
        )
      );

      if (selectedExperiment?.flag.id === flagId) {
        setSelectedExperiment((prev) =>
          prev ? { ...prev, controlCount: 0, treatmentCount: 0 } : null
        );
      }

      setConfirmReset(null);
    } finally {
      setActionLoading(null);
    }
  }

  // -------------------------------------------------------------------------
  // Summary stats
  // -------------------------------------------------------------------------

  const totalExperiments = experiments.length;
  const activeExperiments = experiments.filter((e) => e.flag.enabled).length;
  const totalAssignments = experiments.reduce(
    (sum, e) => sum + e.controlCount + e.treatmentCount,
    0
  );
  const abTests = experiments.filter(
    (e) => e.flag.enabled && e.flag.rollout_percentage > 0 && e.flag.rollout_percentage < 100
  ).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Experimentos A/B</h1>
        <Button
          size="sm"
          variant="outline"
          className="border-[#252542] text-gray-300 hover:bg-[#252542]"
          onClick={() => fetchExperiments()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#252542] bg-[#1A1A2E]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E94560]/10">
              <FlaskConical className="h-5 w-5 text-[#E94560]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalExperiments}</p>
              <p className="text-xs text-gray-400">Total de flags</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#252542] bg-[#1A1A2E]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeExperiments}</p>
              <p className="text-xs text-gray-400">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#252542] bg-[#1A1A2E]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{abTests}</p>
              <p className="text-xs text-gray-400">Testes A/B ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#252542] bg-[#1A1A2E]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAssignments}</p>
              <p className="text-xs text-gray-400">Atribuicoes totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Experiments table */}
      <Card className="border-[#252542] bg-[#1A1A2E]">
        <CardHeader className="border-b border-[#252542] pb-4">
          <CardTitle className="text-lg text-white">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#E94560]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#252542] text-left text-gray-400">
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chave</th>
                    <th className="px-4 py-3">Descricao</th>
                    <th className="px-4 py-3 text-center">Rollout %</th>
                    <th className="px-4 py-3 text-center">Controle</th>
                    <th className="px-4 py-3 text-center">Tratamento</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((exp) => {
                    const total = exp.controlCount + exp.treatmentCount;
                    const isAB =
                      exp.flag.enabled &&
                      exp.flag.rollout_percentage > 0 &&
                      exp.flag.rollout_percentage < 100;

                    return (
                      <tr
                        key={exp.flag.id}
                        className="cursor-pointer border-b border-[#252542]/50 text-white transition-colors hover:bg-[#252542]/50"
                        onClick={() => setSelectedExperiment(exp)}
                      >
                        {/* Toggle */}
                        <td className="px-4 py-3">
                          <Switch
                            checked={exp.flag.enabled}
                            onCheckedChange={() =>
                              handleToggleEnabled(exp.flag.id, exp.flag.enabled)
                            }
                            disabled={actionLoading === exp.flag.id}
                            className={
                              exp.flag.enabled
                                ? 'bg-[#E94560]'
                                : 'bg-[#252542]'
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>

                        {/* Key */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-[#252542] px-2 py-0.5 font-mono text-xs text-[#E94560]">
                              {exp.flag.key}
                            </code>
                            {isAB && (
                              <Badge className="bg-blue-900/50 text-blue-400 text-[10px]">
                                A/B
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 text-gray-300">
                          {exp.flag.description || '-'}
                        </td>

                        {/* Rollout percentage */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-[#252542]">
                              <div
                                className="h-full rounded-full bg-[#E94560] transition-all"
                                style={{
                                  width: `${exp.flag.rollout_percentage}%`,
                                }}
                              />
                            </div>
                            <span className="min-w-[3ch] text-right font-mono text-xs text-gray-300">
                              {exp.flag.rollout_percentage}%
                            </span>
                          </div>
                        </td>

                        {/* Control count */}
                        <td className="px-4 py-3 text-center font-mono text-gray-400">
                          {exp.controlCount}
                        </td>

                        {/* Treatment count */}
                        <td className="px-4 py-3 text-center font-mono text-[#E94560]">
                          {exp.treatmentCount}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-center font-mono text-gray-300">
                          {total}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExperiment(exp);
                            }}
                          >
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {experiments.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhum experimento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution chart (only for active A/B tests) */}
      {experiments.filter(
        (e) =>
          e.flag.enabled &&
          e.flag.rollout_percentage > 0 &&
          e.flag.rollout_percentage < 100 &&
          e.controlCount + e.treatmentCount > 0
      ).length > 0 && (
        <Card className="border-[#252542] bg-[#1A1A2E]">
          <CardHeader className="border-b border-[#252542] pb-4">
            <CardTitle className="text-lg text-white">
              Distribuicao de Atribuicoes — Testes A/B Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={experiments
                  .filter(
                    (e) =>
                      e.flag.enabled &&
                      e.flag.rollout_percentage > 0 &&
                      e.flag.rollout_percentage < 100 &&
                      e.controlCount + e.treatmentCount > 0
                  )
                  .map((e) => ({
                    name: e.flag.key,
                    Controle: e.controlCount,
                    Tratamento: e.treatmentCount,
                  }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1A1A2E',
                    border: '1px solid #252542',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="Controle" fill="#6b7280" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tratamento" fill="#E94560" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Experiment detail modal */}
      <Dialog
        open={!!selectedExperiment}
        onOpenChange={(open) => !open && setSelectedExperiment(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#252542] bg-[#0F0F1A] text-white">
          {selectedExperiment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <FlaskConical className="h-5 w-5 text-[#E94560]" />
                  Detalhes do Experimento
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Chave</p>
                    <code className="rounded bg-[#252542] px-2 py-1 font-mono text-xs text-[#E94560]">
                      {selectedExperiment.flag.key}
                    </code>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <Badge
                      className={
                        selectedExperiment.flag.enabled
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-red-900/50 text-red-400'
                      }
                    >
                      {selectedExperiment.flag.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400">Descricao</p>
                    <p className="font-medium">
                      {selectedExperiment.flag.description || 'Sem descricao'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Criado em</p>
                    <p className="font-medium">
                      {new Date(selectedExperiment.flag.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Atualizado em</p>
                    <p className="font-medium">
                      {new Date(selectedExperiment.flag.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Rollout percentage slider */}
                <div className="space-y-3 rounded-lg border border-[#252542] bg-[#1A1A2E] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-300">
                      Porcentagem de Rollout
                    </p>
                    <span className="font-mono text-lg font-bold text-[#E94560]">
                      {editingPercentage[selectedExperiment.flag.id] ?? selectedExperiment.flag.rollout_percentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={editingPercentage[selectedExperiment.flag.id] ?? selectedExperiment.flag.rollout_percentage}
                    onChange={(e) =>
                      setEditingPercentage((prev) => ({
                        ...prev,
                        [selectedExperiment.flag.id]: parseInt(e.target.value, 10),
                      }))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#252542] accent-[#E94560]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>0% — Todos em controle</span>
                    <span>100% — Todos em tratamento</span>
                  </div>
                  {editingPercentage[selectedExperiment.flag.id] !==
                    selectedExperiment.flag.rollout_percentage && (
                    <Button
                      size="sm"
                      className="w-full bg-[#E94560] text-white hover:bg-[#E94560]/90"
                      disabled={actionLoading === selectedExperiment.flag.id}
                      onClick={() =>
                        handleUpdatePercentage(selectedExperiment.flag.id)
                      }
                    >
                      {actionLoading === selectedExperiment.flag.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Salvar Porcentagem
                    </Button>
                  )}
                </div>

                {/* Assignment distribution */}
                <div className="space-y-3 rounded-lg border border-[#252542] bg-[#1A1A2E] p-4">
                  <p className="text-sm font-medium text-gray-300">
                    Distribuicao de Usuarios
                  </p>
                  {selectedExperiment.controlCount + selectedExperiment.treatmentCount > 0 ? (
                    <div className="space-y-4">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-[#252542] p-3">
                          <p className="text-xl font-bold text-gray-300">
                            {selectedExperiment.controlCount}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            Controle
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#252542] p-3">
                          <p className="text-xl font-bold text-[#E94560]">
                            {selectedExperiment.treatmentCount}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            Tratamento
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#252542] p-3">
                          <p className="text-xl font-bold text-white">
                            {selectedExperiment.controlCount + selectedExperiment.treatmentCount}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            Total
                          </p>
                        </div>
                      </div>

                      {/* Pie chart */}
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'Controle',
                                value: selectedExperiment.controlCount,
                              },
                              {
                                name: 'Tratamento',
                                value: selectedExperiment.treatmentCount,
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            <Cell fill="#6b7280" />
                            <Cell fill="#E94560" />
                          </Pie>
                          <Legend
                            formatter={(value) => (
                              <span className="text-sm text-gray-300">{value}</span>
                            )}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#1A1A2E',
                              border: '1px solid #252542',
                              borderRadius: '8px',
                              color: '#fff',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Distribution bar */}
                      <div className="overflow-hidden rounded-full">
                        <div className="flex h-4">
                          <div
                            className="bg-gray-600 transition-all"
                            style={{
                              width: `${
                                (selectedExperiment.controlCount /
                                  (selectedExperiment.controlCount +
                                    selectedExperiment.treatmentCount)) *
                                100
                              }%`,
                            }}
                          />
                          <div
                            className="bg-[#E94560] transition-all"
                            style={{
                              width: `${
                                (selectedExperiment.treatmentCount /
                                  (selectedExperiment.controlCount +
                                    selectedExperiment.treatmentCount)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>
                          Controle:{' '}
                          {(
                            (selectedExperiment.controlCount /
                              (selectedExperiment.controlCount +
                                selectedExperiment.treatmentCount)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                        <span>
                          Tratamento:{' '}
                          {(
                            (selectedExperiment.treatmentCount /
                              (selectedExperiment.controlCount +
                                selectedExperiment.treatmentCount)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-gray-500">
                      <Users className="h-8 w-8" />
                      <p className="text-sm">Nenhuma atribuicao ainda</p>
                      <p className="text-xs">
                        Os usuarios serao atribuidos automaticamente ao acessar o sistema
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3 border-t border-[#252542] pt-4">
                  <p className="text-sm font-medium text-gray-400">Acoes</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        selectedExperiment.flag.enabled
                          ? 'border-red-800 text-red-400 hover:bg-red-900/30'
                          : 'border-green-800 text-green-400 hover:bg-green-900/30'
                      }
                      disabled={actionLoading === selectedExperiment.flag.id}
                      onClick={() =>
                        handleToggleEnabled(
                          selectedExperiment.flag.id,
                          selectedExperiment.flag.enabled
                        )
                      }
                    >
                      {selectedExperiment.flag.enabled ? (
                        <>
                          <ToggleLeft className="mr-1 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <ToggleRight className="mr-1 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-800 text-amber-400 hover:bg-amber-900/30"
                      disabled={
                        actionLoading === selectedExperiment.flag.id ||
                        selectedExperiment.controlCount +
                          selectedExperiment.treatmentCount ===
                          0
                      }
                      onClick={() =>
                        setConfirmReset(selectedExperiment.flag.id)
                      }
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Resetar Atribuicoes
                    </Button>
                  </div>
                  {selectedExperiment.controlCount +
                    selectedExperiment.treatmentCount >
                    0 && (
                    <p className="text-[11px] text-gray-500">
                      <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-500" />
                      Resetar atribuicoes fara com que todos os usuarios sejam
                      reatribuidos na proxima visita. Use com cuidado.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm reset dialog */}
      <Dialog
        open={!!confirmReset}
        onOpenChange={(open) => !open && setConfirmReset(null)}
      >
        <DialogContent className="border-[#252542] bg-[#0F0F1A] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Reset de Atribuicoes
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-300">
              Tem certeza que deseja remover todas as atribuicoes deste
              experimento? Todos os usuarios serao reatribuidos
              automaticamente na proxima visita.
            </p>
            <p className="text-xs text-gray-500">
              Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-[#252542] text-gray-300 hover:bg-[#252542]"
                onClick={() => setConfirmReset(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
                disabled={!!actionLoading}
                onClick={() => confirmReset && handleResetAssignments(confirmReset)}
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Sim, Resetar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
