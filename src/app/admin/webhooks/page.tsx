'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import type { WebhookLog } from '@/types/database';

const PAGE_SIZE = 20;

export default function AdminWebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [reprocessingAll, setReprocessingAll] = useState(false);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('webhook_logs')
        .select('*', { count: 'exact' })
        .order('processed_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }
      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (dateFrom) {
        query = query.gte('processed_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('processed_at', `${dateTo}T23:59:59`);
      }

      const { data, count } = await query;
      setLogs(data ?? []);
      setTotalCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sourceFilter, eventTypeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleReprocess = async (logId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reprocessingId) return;
    setReprocessingId(logId);
    try {
      const res = await fetch('/api/admin/webhooks/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Erro ao reprocessar: ${data.error || 'Erro desconhecido'}`);
      } else {
        alert(`Reprocessado com sucesso! Plano: ${data.plan || '-'}`);
        fetchLogs();
      }
    } catch {
      alert('Erro de rede ao reprocessar');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleReprocessAll = async () => {
    if (reprocessingAll) return;
    if (!confirm('Reprocessar todos os webhooks não processados? Isso pode levar alguns minutos.')) return;
    setReprocessingAll(true);
    try {
      const res = await fetch('/api/admin/webhooks/reprocess-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Erro ao reprocessar: ${data.error || 'Erro desconhecido'}`);
      } else {
        alert(`Reprocessamento concluído!\n\nTotal: ${data.total}\nSucesso: ${data.processed}\nFalhas: ${data.failed}`);
        fetchLogs();
      }
    } catch {
      alert('Erro de rede ao reprocessar');
    } finally {
      setReprocessingAll(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Get unique sources from logs
  const [sources, setSources] = useState<string[]>([]);
  useEffect(() => {
    async function fetchSources() {
      const { data } = await supabase
        .from('webhook_logs')
        .select('source')
        .limit(100);
      const unique = [...new Set((data ?? []).map((d: { source: string }) => d.source))] as string[];
      setSources(unique);
    }
    fetchSources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Webhooks</h1>
        <Button
          onClick={handleReprocessAll}
          disabled={reprocessingAll}
          className="bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
        >
          {reprocessingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {reprocessingAll ? 'Reprocessando...' : 'Reprocessar Pendentes'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 pb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-400">Filtros</span>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">
                Fonte
              </label>
              <Select
                value={sourceFilter}
                onValueChange={(val) => {
                  setSourceFilter(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white">
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                  <SelectItem value="all">Todas</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">
                Evento
              </label>
              <Select
                value={eventTypeFilter}
                onValueChange={(val) => {
                  setEventTypeFilter(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white">
                  <SelectValue placeholder="Evento" />
                </SelectTrigger>
                <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="cancel">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="mb-1 block text-xs text-gray-500">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="unhandled">Não Processado</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="reprocessed">Reprocessado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                className="w-40 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                className="w-40 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => {
                setSourceFilter('all');
                setEventTypeFilter('all');
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
                setPage(0);
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3">Fonte</th>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isError = log.status === 'error' || (!!log.error_message && log.status !== 'info');
                    const isExpanded = expandedId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className="cursor-pointer border-b border-[#131B35]/50 text-white transition-colors hover:bg-[#131B35]/50"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {log.source}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-[#131B35] text-gray-300">
                              {log.event_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {log.email_extracted || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                log.status === 'error' || isError
                                  ? 'border-red-800 bg-red-900/30 text-red-400'
                                  : log.status === 'ignored' || log.status === 'unhandled'
                                    ? 'border-yellow-800 bg-yellow-900/30 text-yellow-400'
                                    : log.status === 'warning'
                                      ? 'border-orange-800 bg-orange-900/30 text-orange-400'
                                      : log.status === 'reprocessed'
                                        ? 'border-blue-800 bg-blue-900/30 text-blue-400'
                                        : log.status === 'info'
                                          ? 'border-gray-700 bg-gray-800/30 text-gray-400'
                                          : 'border-green-800 bg-green-900/30 text-green-400'
                              }
                            >
                              {log.status === 'error' || isError
                                ? 'Erro'
                                : log.status === 'ignored' || log.status === 'unhandled'
                                  ? 'Não Processado'
                                  : log.status === 'warning'
                                    ? 'Aviso'
                                    : log.status === 'reprocessed'
                                      ? 'Reprocessado'
                                      : log.status === 'info'
                                        ? 'Info'
                                        : 'Sucesso'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(log.processed_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-[#131B35]/50">
                            <td colSpan={6} className="bg-[#020617] px-4 py-4">
                              <div className="space-y-3">
                                {log.error_message && (
                                  <div>
                                    <p className="text-xs font-medium uppercase text-red-400">
                                      Mensagem de Erro
                                    </p>
                                    <p className="mt-1 text-sm text-red-300">
                                      {log.error_message}
                                    </p>
                                  </div>
                                )}
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Plano Concedido
                                    </p>
                                    <p className="text-gray-300">
                                      {log.plan_granted || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Usuário Criado
                                    </p>
                                    <p className="text-gray-300">
                                      {log.user_created ? 'Sim' : 'Não'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Processado em
                                    </p>
                                    <p className="text-gray-300">
                                      {new Date(
                                        log.processed_at
                                      ).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                                    Payload JSON
                                  </p>
                                  <pre className="max-h-64 overflow-auto rounded-lg border border-[#131B35] bg-[#0A0F1E] p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                                {(log.status === 'error' || log.status === 'unhandled' || log.status === 'warning') && (
                                  <div className="pt-2">
                                    <Button
                                      size="sm"
                                      onClick={(e) => handleReprocess(log.id, e)}
                                      disabled={reprocessingId === log.id}
                                      className="bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                                    >
                                      {reprocessingId === log.id ? (
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="mr-2 h-3 w-3" />
                                      )}
                                      Reprocessar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhum log de webhook encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#131B35] px-4 py-3">
              <p className="text-sm text-gray-400">
                Mostrando {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
