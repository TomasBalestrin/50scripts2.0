'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sparkles, Copy, Check, Loader2, History,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { BASE_MONTHLY_SCRIPTS } from '@/lib/constants';
import { XpToast } from '@/components/gamification/xp-toast';

interface HistoryScript {
  id: string;
  situation: string;
  description: string;
  generated_content: string;
  created_at: string;
}

interface HistoryResponse {
  scripts: HistoryScript[];
  creditsUsed: number;
  bonusScripts: number;
}

interface GenerateResponse {
  content: string;
  remaining: number;
  xp: { cyclic_xp: number; cyclic_xp_cap: number } | null;
}

const LOADING_STEPS = [
  'Analisando contexto...',
  'Consultando seu perfil...',
  'Gerando script personalizado...',
];

const MIN_LOADING_MS = 5000;

export default function PersonalizadosPage() {
  const searchParams = useSearchParams();

  const [situation, setSituation] = useState('');
  const [details, setDetails] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Credits
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [bonusScripts, setBonusScripts] = useState(0);
  const remaining = (BASE_MONTHLY_SCRIPTS + bonusScripts) - creditsUsed;

  // History
  const [history, setHistory] = useState<HistoryScript[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // XP toast
  const [xpTrigger, setXpTrigger] = useState(0);

  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pre-fill situation from URL params
  useEffect(() => {
    const situacaoParam = searchParams.get('situacao');
    if (situacaoParam) {
      setSituation(decodeURIComponent(situacaoParam));
    }
  }, [searchParams]);

  // Load history and credits on mount
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/personalizados/history');
      if (!res.ok) return;
      const data: HistoryResponse = await res.json();
      setHistory(data.scripts);
      setCreditsUsed(data.creditsUsed);
      setBonusScripts(data.bonusScripts);
    } catch {
      // Silently fail - history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!situation.trim() || !details.trim() || remaining <= 0) return;

    setGenerating(true);
    setResult('');
    setError('');
    setLoadingStep(0);
    setLoadingProgress(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const startTime = Date.now();

    // Animate progress bar over 5 seconds
    loadingTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / MIN_LOADING_MS) * 100, 95);
      setLoadingProgress(pct);
    }, 100);

    // Cycle through loading steps
    stepTimerRef.current = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 1600);

    try {
      const res = await fetch('/api/personalizados/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: situation.trim(), details: details.trim() }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar script. Tente novamente.');
        return;
      }

      const generatedData = data as GenerateResponse;

      // Ensure minimum 5 seconds of loading
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }

      setLoadingProgress(100);
      setResult(generatedData.content);
      setCreditsUsed(prev => prev + 1);
      setXpTrigger(t => t + 1);

      // Refresh history
      fetchHistory();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled - don't show error
      } else {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      }
    } finally {
      abortControllerRef.current = null;
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setGenerating(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setGenerating(false);
    setLoadingProgress(0);
    setLoadingStep(0);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              <Sparkles className="mr-2 inline-block h-7 w-7 text-[#3B82F6]" />
              Gere scripts personalizados para você!
            </h1>
          </div>
          <div className="flex-shrink-0">
            <Card className="border-[#1D4ED8]/30 bg-[#131B35]">
              <CardContent className="px-4 py-2">
                <span className="text-sm text-[#94A3B8]">
                  <span className={`text-lg font-bold ${remaining > 0 ? 'text-[#3B82F6]' : 'text-red-400'}`}>
                    {remaining}
                  </span>
                  {' '}scripts restantes
                </span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form */}
        <Card className="border-[#1D4ED8]/20 bg-[#0A0F1E]">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="situation" className="text-sm font-medium text-white">
                Situação ou o que o cliente falou
              </Label>
              <Textarea
                id="situation"
                placeholder="Ex: Lead demonstrou interesse mas não responde há 3 dias..."
                value={situation}
                onChange={e => setSituation(e.target.value)}
                disabled={generating}
                className="min-h-[100px] resize-none border-[#1D4ED8]/30 bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details" className="text-sm font-medium text-white">
                Descreva o que você quer gerar
              </Label>
              <Textarea
                id="details"
                placeholder="Detalhes do produto, tom desejado, abordagem..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                disabled={generating}
                className="min-h-[100px] resize-none border-[#1D4ED8]/30 bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#3B82F6]"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || !situation.trim() || !details.trim() || remaining <= 0}
              className="w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/80 disabled:opacity-50"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Gerar Script
                </>
              )}
            </Button>

            {remaining <= 0 && !generating && (
              <p className="text-center text-sm text-red-400">
                Você atingiu o limite de scripts deste mês. Continue usando a plataforma para ganhar bônus!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {generating && (
          <Card className="border-[#1D4ED8]/20 bg-[#0A0F1E]">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                {LOADING_STEPS.map((step, idx) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                      idx <= loadingStep ? 'text-[#3B82F6]' : 'text-[#94A3B8]/40'
                    }`}
                  >
                    {idx < loadingStep ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : idx === loadingStep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    {step}
                  </div>
                ))}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#131B35]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="mt-2 w-full border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && !generating && (
          <Card className="border-[#1D4ED8]/30 bg-[#0A0F1E]">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Script Gerado</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result, 'result')}
                  className="border-[#1D4ED8]/30 bg-[#131B35] text-white hover:bg-[#1D4ED8]/20"
                >
                  {copied === 'result' ? (
                    <>
                      <Check className="mr-1 h-4 w-4 text-green-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      Copiar Script
                    </>
                  )}
                </Button>
              </div>
              <div className="whitespace-pre-wrap rounded-lg border border-[#1D4ED8]/20 bg-[#131B35] p-4 text-sm leading-relaxed text-[#94A3B8]">
                {result}
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <History className="h-5 w-5 text-[#3B82F6]" />
            Histórico de Scripts Gerados
          </h2>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
            </div>
          ) : history.length === 0 ? (
            <Card className="border-[#1D4ED8]/10 bg-[#0A0F1E]">
              <CardContent className="py-8 text-center text-[#94A3B8]">
                Nenhum script gerado ainda. Use o formulário acima para criar seu primeiro!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map(script => {
                const isExpanded = expandedId === script.id;
                return (
                  <Card
                    key={script.id}
                    className="border-[#1D4ED8]/10 bg-[#0A0F1E] transition-colors hover:border-[#1D4ED8]/20"
                  >
                    <CardContent className="p-4">
                      <div
                        className="flex cursor-pointer items-center justify-between"
                        onClick={() => setExpandedId(isExpanded ? null : script.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[#94A3B8]/60">{formatDate(script.created_at)}</p>
                          <p className="mt-1 truncate text-sm text-white">
                            {truncate(script.situation, 80)}
                          </p>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleCopy(script.generated_content, script.id);
                            }}
                            className="h-8 w-8 p-0 text-[#94A3B8] hover:text-white"
                          >
                            {copied === script.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-[#1D4ED8]/10 pt-4">
                          <div>
                            <p className="mb-1 text-xs font-medium text-[#94A3B8]/60">Situação</p>
                            <p className="text-sm text-[#94A3B8]">{script.situation}</p>
                          </div>
                          {script.description && (
                            <div>
                              <p className="mb-1 text-xs font-medium text-[#94A3B8]/60">Detalhes</p>
                              <p className="text-sm text-[#94A3B8]">{script.description}</p>
                            </div>
                          )}
                          <div>
                            <p className="mb-1 text-xs font-medium text-[#94A3B8]/60">Script Gerado</p>
                            <div className="whitespace-pre-wrap rounded-lg bg-[#131B35] p-3 text-sm leading-relaxed text-[#94A3B8]">
                              {script.generated_content}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <XpToast amount={10} trigger={xpTrigger} />
    </div>
  );
}
