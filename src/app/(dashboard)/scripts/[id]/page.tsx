'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  Tag,
  DollarSign,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Script, ScriptSale, Tone } from '@/types/database';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/scripts/star-rating';
import { SCRIPT_COPY_COOLDOWN_MS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { XpToast } from '@/components/gamification/xp-toast';

const TONE_LABELS: Record<string, string> = {
  casual: 'Casual',
  formal: 'Formal',
  direct: 'Direto',
};

function highlightVariables(text: string): React.ReactNode[] {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{[^}]+}}$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-block rounded bg-yellow-400/20 px-1 py-0.5 font-mono text-yellow-300"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function formatCooldownTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SkeletonDetail() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-[#131B35]" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-[#0A0F1E]" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-[#131B35]" />
            <div className="h-6 w-24 rounded-full bg-[#131B35]" />
          </div>
        </div>
        <div className="rounded-xl bg-[#0A0F1E] p-6 space-y-3">
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-3/4 rounded bg-[#131B35]" />
          <div className="h-4 w-full rounded bg-[#131B35]" />
          <div className="h-4 w-5/6 rounded bg-[#131B35]" />
        </div>
        <div className="h-14 w-full rounded-xl bg-[#131B35]" />
      </div>
    </div>
  );
}

export default function ScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;
  const { profile } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTone, setActiveTone] = useState<'casual' | 'formal' | 'direct'>('casual');
  const [copied, setCopied] = useState(false);

  // Cooldown state
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sales state
  const [sales, setSales] = useState<ScriptSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ScriptSale | null>(null);
  const [saleForm, setSaleForm] = useState({
    product_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_value: '',
  });
  const [submittingSale, setSubmittingSale] = useState(false);

  // XP toast trigger
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(5);

  // Rating state
  const [rateExpanded, setRateExpanded] = useState(false);
  const [rating, setRating] = useState(0);
  const [resultedInSale, setResultedInSale] = useState(false);
  const [saleValueRating, setSaleValueRating] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Initialize cooldown from localStorage
  useEffect(() => {
    if (!scriptId) return;
    const key = `cooldown_script_${scriptId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const endTime = parseInt(stored, 10);
      const remaining = endTime - Date.now();
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [scriptId]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      return;
    }

    cooldownIntervalRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        const key = `cooldown_script_${scriptId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return 0;
        const endTime = parseInt(stored, 10);
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
          localStorage.removeItem(key);
          return 0;
        }
        return remaining;
      });
    }, 1000);

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [cooldownRemaining > 0, scriptId]);

  // Fetch script
  useEffect(() => {
    async function fetchScript() {
      try {
        const res = await fetch(`/api/scripts/${scriptId}`);
        if (res.ok) {
          const data = await res.json();
          setScript(data.script ?? data);
        }
      } catch (err) {
        console.error('Error fetching script:', err);
      } finally {
        setLoading(false);
      }
    }

    if (scriptId) {
      fetchScript();
    }
  }, [scriptId]);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    if (!scriptId) return;
    setSalesLoading(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/sale`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales ?? []);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setSalesLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    if (scriptId) {
      fetchSales();
    }
  }, [scriptId, fetchSales]);

  const activeContent = useMemo(() => {
    if (!script) return '';
    switch (activeTone) {
      case 'formal':
        return script.content_formal || script.content;
      case 'direct':
        return script.content_direct || script.content;
      default:
        return script.content;
    }
  }, [script, activeTone]);

  const isCooldownActive = cooldownRemaining > 0;

  const handleCopy = useCallback(async () => {
    if (!script || isCooldownActive) return;
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      toast('Copiado!', 'success');

      // Start cooldown
      const endTime = Date.now() + SCRIPT_COPY_COOLDOWN_MS;
      localStorage.setItem(`cooldown_script_${scriptId}`, endTime.toString());
      setCooldownRemaining(SCRIPT_COPY_COOLDOWN_MS);

      // Register usage + award XP
      try {
        await fetch(`/api/scripts/${script.id}/use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tone_used: activeTone }),
        });
        setXpAmount(5);
        setXpTrigger((t) => t + 1);
      } catch {
        // Non-blocking
      }

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Erro ao copiar', 'error');
    }
  }, [script, activeContent, activeTone, toast, isCooldownActive, scriptId]);

  // Sale form handlers
  const openSaleDialog = useCallback((sale?: ScriptSale) => {
    if (sale) {
      setEditingSale(sale);
      setSaleForm({
        product_name: sale.product_name,
        sale_date: sale.sale_date,
        sale_value: sale.sale_value.toString(),
      });
    } else {
      setEditingSale(null);
      setSaleForm({
        product_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        sale_value: '',
      });
    }
    setSaleDialogOpen(true);
  }, []);

  const handleSaleSubmit = useCallback(async () => {
    if (!scriptId || !saleForm.product_name || !saleForm.sale_date || !saleForm.sale_value) return;
    setSubmittingSale(true);
    try {
      const payload = {
        ...(editingSale ? { id: editingSale.id } : {}),
        product_name: saleForm.product_name,
        sale_date: saleForm.sale_date,
        sale_value: parseFloat(saleForm.sale_value),
      };

      const res = await fetch(`/api/scripts/${scriptId}/sale`, {
        method: editingSale ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editingSale ? 'Venda atualizada!' : 'Venda registrada!', 'success');
        setSaleDialogOpen(false);
        setEditingSale(null);
        fetchSales();
        if (!editingSale) {
          setXpAmount(5);
          setXpTrigger((t) => t + 1);
        }
      } else {
        toast('Erro ao salvar venda', 'error');
      }
    } catch {
      toast('Erro ao salvar venda', 'error');
    } finally {
      setSubmittingSale(false);
    }
  }, [scriptId, saleForm, editingSale, toast, fetchSales]);

  const handleDeleteSale = useCallback(async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
      const res = await fetch(`/api/scripts/${scriptId}/sale`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: saleId }),
      });

      if (res.ok) {
        toast('Venda excluida', 'success');
        fetchSales();
      } else {
        toast('Erro ao excluir venda', 'error');
      }
    } catch {
      toast('Erro ao excluir venda', 'error');
    }
  }, [scriptId, toast, fetchSales]);

  const handleSubmitRating = useCallback(async () => {
    if (!script || rating === 0) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/scripts/${script.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveness_rating: rating,
          resulted_in_sale: resultedInSale,
          sale_value: resultedInSale && saleValueRating ? parseFloat(saleValueRating) : null,
          feedback_note: feedbackNote || null,
        }),
      });

      if (res.ok) {
        toast('Avaliacao enviada!', 'success');
        setRateExpanded(false);
        setRating(0);
        setResultedInSale(false);
        setSaleValueRating('');
        setFeedbackNote('');
      } else {
        toast('Erro ao enviar avaliacao', 'error');
      }
    } catch {
      toast('Erro ao enviar avaliacao', 'error');
    } finally {
      setSubmittingRating(false);
    }
  }, [script, rating, resultedInSale, saleValueRating, feedbackNote, toast]);

  if (loading) {
    return <SkeletonDetail />;
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-[#94A3B8]">Script nao encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{script.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {script.category && (
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{
                    backgroundColor: script.category.color + '33',
                    color: script.category.color,
                  }}
                >
                  {script.category.name}
                </span>
              )}
              <StarRating value={Math.round(script.global_effectiveness)} readonly size={16} />
              <span className="text-xs text-[#94A3B8]">
                {script.global_usage_count} {script.global_usage_count === 1 ? 'uso' : 'usos'}
              </span>
            </div>
          </div>

          {/* Tone Toggle */}
          <div className="flex gap-2">
            {(['casual', 'formal', 'direct'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => setActiveTone(tone)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTone === tone
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#131B35] text-[#94A3B8] hover:bg-[#131B35]/80 hover:text-white'
                }`}
              >
                {TONE_LABELS[tone]}
              </button>
            ))}
          </div>

          {/* Script Content */}
          <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-white/90">
              {highlightVariables(activeContent)}
            </p>
          </div>

          {/* Copy Button with Cooldown */}
          <button
            onClick={handleCopy}
            disabled={isCooldownActive}
            className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white transition-colors active:scale-[0.98] ${
              isCooldownActive
                ? 'bg-[#1D4ED8]/50 cursor-not-allowed'
                : 'bg-[#1D4ED8] hover:bg-[#1D4ED8]/90'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" />
                Copiado!
              </>
            ) : isCooldownActive ? (
              <>
                <Clock className="h-5 w-5" />
                Copiar ({formatCooldownTime(cooldownRemaining)})
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                COPIAR SCRIPT
              </>
            )}
          </button>

          {/* Gerou Venda Button */}
          <button
            onClick={() => openSaleDialog()}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#10B981] py-4 text-base font-bold text-white transition-colors hover:bg-[#10B981]/90 active:scale-[0.98]"
          >
            <DollarSign className="h-5 w-5" />
            Gerou Venda
          </button>

          {/* Sales List */}
          {salesLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-[#0A0F1E]" />
              ))}
            </div>
          ) : sales.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#94A3B8]">
                Vendas registradas ({sales.length})
              </h3>
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {sale.product_name}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span>
                        {new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-semibold text-[#10B981]">
                        R$ {Number(sale.sale_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <button
                      onClick={() => openSaleDialog(sale)}
                      className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#131B35] hover:text-white"
                      title="Editar venda"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Excluir venda"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Context Card */}
          {script.context_description && (
            <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-semibold text-white">Quando usar este script</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#94A3B8]">
                {script.context_description}
              </p>
            </div>
          )}

          {/* Tags */}
          {script.tags && script.tags.length > 0 && (
            <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-semibold text-white">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {script.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#131B35] px-3 py-1 text-xs text-[#94A3B8]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rate Section */}
          <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] overflow-hidden">
            <button
              onClick={() => setRateExpanded(!rateExpanded)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-semibold text-white">Avaliar este script</h3>
              </div>
              {rateExpanded ? (
                <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
              )}
            </button>

            <AnimatePresence>
              {rateExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 px-5 pb-5">
                    {/* Star Rating */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                        Efetividade
                      </label>
                      <StarRating value={rating} onChange={setRating} size={28} />
                    </div>

                    {/* Sale Toggle */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                        Resultou em venda?
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setResultedInSale(true)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            resultedInSale
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#131B35] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => {
                            setResultedInSale(false);
                            setSaleValueRating('');
                          }}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            !resultedInSale
                              ? 'bg-[#1D4ED8]/20 text-[#1D4ED8] border border-[#1D4ED8]/30'
                              : 'bg-[#131B35] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          Nao
                        </button>
                      </div>
                    </div>

                    {/* Sale Value */}
                    <AnimatePresence>
                      {resultedInSale && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                            Valor da venda (R$)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={saleValueRating}
                            onChange={(e) => setSaleValueRating(e.target.value)}
                            placeholder="0,00"
                            className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/50 outline-none transition-colors focus:border-[#1D4ED8]"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Feedback Note */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                        Observacao (opcional)
                      </label>
                      <textarea
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        placeholder="Como foi a experiencia com este script?"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[#131B35] bg-[#020617] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/50 outline-none transition-colors focus:border-[#1D4ED8]"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleSubmitRating}
                      disabled={rating === 0 || submittingRating}
                      className="w-full rounded-lg bg-[#3B82F6] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6]/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingRating ? 'Enviando...' : 'Enviar avaliacao'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="border-[#131B35] bg-[#0A0F1E]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSale ? 'Editar Venda' : 'Registrar Venda'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                O que foi vendido
              </label>
              <input
                type="text"
                value={saleForm.product_name}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, product_name: e.target.value }))
                }
                placeholder="Ex: Consultoria, Produto X..."
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/50 outline-none transition-colors focus:border-[#1D4ED8]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                Data da venda
              </label>
              <input
                type="date"
                value={saleForm.sale_date}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, sale_date: e.target.value }))
                }
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/50 outline-none transition-colors focus:border-[#1D4ED8] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-[#94A3B8]">
                Valor da venda (R$)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={saleForm.sale_value}
                onChange={(e) =>
                  setSaleForm((prev) => ({ ...prev, sale_value: e.target.value }))
                }
                placeholder="0,00"
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/50 outline-none transition-colors focus:border-[#1D4ED8]"
              />
            </div>
            <button
              onClick={handleSaleSubmit}
              disabled={
                submittingSale ||
                !saleForm.product_name ||
                !saleForm.sale_date ||
                !saleForm.sale_value
              }
              className="w-full rounded-lg bg-[#10B981] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingSale
                ? 'Salvando...'
                : editingSale
                ? 'Atualizar Venda'
                : 'Registrar Venda'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast container – offset above bottom nav on mobile */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 lg:bottom-6 lg:right-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg cursor-pointer ${
                t.type === 'error'
                  ? 'bg-red-500'
                  : t.type === 'info'
                  ? 'bg-[#3B82F6]'
                  : 'bg-emerald-500'
              }`}
              onClick={() => dismiss(t.id)}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <XpToast amount={xpAmount} trigger={xpTrigger} />
    </div>
  );
}
