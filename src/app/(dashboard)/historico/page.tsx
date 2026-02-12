'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  ChevronDown,
  Star,
  DollarSign,
  MessageSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
} from 'lucide-react';
import { fetcher } from '@/lib/swr/fetcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface ScriptInfo {
  id: string;
  title: string;
  category_id: string;
  category: CategoryInfo | CategoryInfo[];
}

interface UsageItem {
  id: string;
  script_id: string;
  tone_used: string | null;
  used_at: string;
  effectiveness_rating: number | null;
  resulted_in_sale: boolean | null;
  sale_value: number | null;
  feedback_note: string | null;
  scripts: ScriptInfo;
}

interface HistoryResponse {
  usages: UsageItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategory(script: ScriptInfo): CategoryInfo | null {
  if (!script.category) return null;
  if (Array.isArray(script.category)) return script.category[0] ?? null;
  return script.category;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function groupByDate(usages: UsageItem[]): Record<string, UsageItem[]> {
  const groups: Record<string, UsageItem[]> = {};
  for (const usage of usages) {
    const dateKey = formatDate(usage.used_at);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(usage);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#131B35]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-[#131B35]" />
          <div className="h-3 w-1/2 rounded bg-[#131B35]" />
          <div className="h-3 w-1/3 rounded bg-[#131B35]" />
        </div>
      </div>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

interface UsageCardProps {
  usage: UsageItem;
}

function UsageCard({ usage }: UsageCardProps) {
  const category = getCategory(usage.scripts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4 transition-colors hover:border-[#1D4ED8]/20"
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        {category && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: category.color + '20' }}
          >
            {category.icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Script title and time */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-white line-clamp-1">
              {usage.scripts.title}
            </h4>
            <span className="shrink-0 text-xs text-[#94A3B8]">
              {formatTime(usage.used_at)}
            </span>
          </div>

          {/* Trail name */}
          {category && (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: category.color + '20',
                color: category.color,
              }}
            >
              {category.name}
            </span>
          )}

          {/* Details row */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Rating */}
            {usage.effectiveness_rating != null && usage.effectiveness_rating > 0 && (
              <StarDisplay rating={usage.effectiveness_rating} />
            )}

            {/* Sale */}
            {usage.resulted_in_sale && usage.sale_value != null && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                <DollarSign className="h-3 w-3" />
                Resultou em venda: {formatCurrency(usage.sale_value)}
              </span>
            )}

            {/* No sale explicit */}
            {usage.resulted_in_sale === false && (
              <span className="text-xs text-[#94A3B8]">
                Sem venda
              </span>
            )}
          </div>

          {/* Feedback note */}
          {usage.feedback_note && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#131B35]/50 px-3 py-2">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-[#94A3B8]" />
              <p className="text-xs leading-relaxed text-[#94A3B8]">
                {usage.feedback_note}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Trail options for filter
// ---------------------------------------------------------------------------

const TRAIL_OPTIONS = [
  { value: '', label: 'Todas as trilhas' },
  { value: 'abordagem-inicial', label: 'Abordagem Inicial' },
  { value: 'ativacao-base', label: 'Ativacao de Base' },
  { value: 'qualificacao', label: 'Qualificacao' },
  { value: 'apresentacao-oferta', label: 'Apresentacao de Oferta' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'contorno-objecao', label: 'Contorno de Objecao' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'pos-venda', label: 'Pos-venda' },
];

const RESULT_OPTIONS = [
  { value: '', label: 'Todos os resultados' },
  { value: 'sale', label: 'Vendas' },
  { value: 'no-sale', label: 'Sem venda' },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HistoricoPage() {
  const [trail, setTrail] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useSWR<HistoryResponse>(
    `/api/scripts/history?trail=${trail}&result=${result}&page=${page}&limit=20`,
    fetcher
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [trail, result]);

  const grouped = data ? groupByDate(data.usages) : {};
  const dateKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <History className="h-7 w-7 text-[#1D4ED8]" />
            Historico de Uso
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Todos os scripts que voce utilizou
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-label={filtersOpen ? 'Fechar filtros' : 'Abrir filtros'}
            className="flex w-full items-center justify-between text-sm font-medium text-white"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1D4ED8]" />
              Filtros
              {(trail || result) && (
                <span className="rounded-full bg-[#1D4ED8]/20 px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                  Ativos
                </span>
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#94A3B8] transition-transform ${
                filtersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Trail filter */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                      Trilha
                    </label>
                    <select
                      value={trail}
                      onChange={(e) => setTrail(e.target.value)}
                      aria-label="Filtrar por trilha"
                      className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#1D4ED8]"
                    >
                      {TRAIL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Result filter */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#94A3B8]">
                      Resultado
                    </label>
                    <select
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      aria-label="Filtrar por resultado"
                      className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#1D4ED8]"
                    >
                      {RESULT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear filters */}
                {(trail || result) && (
                  <button
                    onClick={() => {
                      setTrail('');
                      setResult('');
                    }}
                    aria-label="Limpar todos os filtros"
                    className="mt-3 text-xs font-medium text-[#1D4ED8] transition-colors hover:text-[#1D4ED8]/80"
                  >
                    Limpar filtros
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
              <span className="text-sm text-[#94A3B8]">Carregando historico...</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && data && data.usages.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#131B35] bg-[#0A0F1E] py-16">
            <Inbox className="mb-4 h-12 w-12 text-[#131B35]" />
            <h3 className="mb-1 text-lg font-semibold text-white">
              {trail || result
                ? 'Nenhum resultado encontrado'
                : 'Voce ainda nao usou nenhum script'}
            </h3>
            <p className="text-sm text-[#94A3B8]">
              {trail || result
                ? 'Tente ajustar os filtros'
                : 'Comece usando scripts para ver seu historico aqui'}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && dateKeys.length > 0 && (
          <div className="space-y-6">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{dateKey}</span>
                  <div className="h-px flex-1 bg-[#131B35]" />
                  <span className="text-xs text-[#94A3B8]">
                    {grouped[dateKey].length} {grouped[dateKey].length === 1 ? 'uso' : 'usos'}
                  </span>
                </div>

                {/* Usage cards */}
                <div className="space-y-3">
                  {grouped[dateKey].map((usage) => (
                    <UsageCard key={usage.id} usage={usage} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && data && data.totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-[#131B35] bg-[#0A0F1E] px-4 py-3">
            <span className="text-xs text-[#94A3B8]">
              Pagina {data.page} de {data.totalPages} ({data.total} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Pagina anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#131B35] text-white transition-colors hover:bg-[#131B35] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                aria-label="Proxima pagina"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#131B35] text-white transition-colors hover:bg-[#131B35] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
