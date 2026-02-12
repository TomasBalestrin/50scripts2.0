'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { ScriptCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Copy, Check, Save, RefreshCw, Loader2,
  MessageSquare, FileText, Tag, ShieldAlert, FolderOpen,
} from 'lucide-react';

interface GeneratedScript {
  title?: string;
  content?: string;
  content_formal?: string;
  content_direct?: string;
  context_description?: string;
  tags?: string[];
  objection_keywords?: string[];
  suggested_category?: string;
}

function AIProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p;
        return p + (90 - p) * 0.1;
      });
    }, 300);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#131B35]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function AIGeneratorPage() {
  const [categoryId, setCategoryId] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<string>('casual');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'casual' | 'formal' | 'direct'>('casual');
  const [startTime, setStartTime] = useState<number | null>(null);

  const { data: catData } = useSWR('/api/categories');
  const categories: ScriptCategory[] = catData?.categories || [];

  const { data: creditsData, mutate: mutateCredits } = useSWR('/api/ai/credits');
  const creditsRemaining = creditsData?.credits_remaining ?? null;

  const handleGenerate = async () => {
    if (!categoryId || context.length < 10) return;
    setGenerating(true);
    setStartTime(Date.now());
    setResult('');
    setSaved(false);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, context, tone }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data.content);
        mutateCredits();
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch {
      setResult('Erro ao conectar com a IA. Tente novamente.');
    }
    setGenerating(false);
    setStartTime(null);
  };

  // Try to parse JSON from result (may have markdown code fences)
  function tryParseJSON(text: string): GeneratedScript | null {
    try {
      // Try direct parse first
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
      // Try stripping markdown code fences
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch { /* ignore */ }
      }
    }
    return null;
  }

  const parsed = result ? tryParseJSON(result) : null;

  const getActiveContent = (): string => {
    if (!parsed) return result;
    if (activeTab === 'formal' && parsed.content_formal) return parsed.content_formal;
    if (activeTab === 'direct' && parsed.content_direct) return parsed.content_direct;
    return parsed.content || result;
  };

  const handleCopy = async (text: string, label?: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label || 'main');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!result || !categoryId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const title = parsed?.title || `Script IA - ${new Date().toLocaleDateString('pt-BR')}`;
    const content = getActiveContent();

    await supabase.from('scripts').insert({
      category_id: categoryId,
      title,
      content,
      context_description: parsed?.context_description || context,
      is_ai_generated: true,
      generated_by_user_id: user.id,
      min_plan: 'premium',
      display_order: 999,
    });
    setSaved(true);
  };

  const hasToneVariations = parsed && (parsed.content_formal || parsed.content_direct);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#1D4ED8]" />
          Gerador de Scripts IA
        </h1>
        {creditsRemaining !== null && (
          <Badge className="bg-[#131B35] text-white">
            {creditsRemaining === -1 ? '∞' : creditsRemaining} créditos
          </Badge>
        )}
      </div>

      <Card className="bg-[#0A0F1E] border-[#131B35] mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Trilha / Categoria</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-[#131B35] border-[#1E2A52] text-white">
                <SelectValue placeholder="Selecione a trilha" />
              </SelectTrigger>
              <SelectContent className="bg-[#131B35] border-[#1E2A52]">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white">
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Contexto da situação (mínimo 10 caracteres)
            </label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Preciso abordar um lead que demonstrou interesse em nosso curso de marketing digital mas não respondeu a última mensagem há 3 dias..."
              className="bg-[#131B35] border-[#1E2A52] text-white min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Tom</label>
            <div className="flex gap-2">
              {[
                { value: 'casual', label: 'Casual' },
                { value: 'formal', label: 'Formal' },
                { value: 'direct', label: 'Direto' },
              ].map((t) => (
                <Button
                  key={t.value}
                  variant={tone === t.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTone(t.value)}
                  className={
                    tone === t.value
                      ? 'bg-[#1D4ED8] text-white'
                      : 'border-[#1E2A52] text-gray-400 hover:bg-[#131B35]'
                  }
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !categoryId || context.length < 10}
            className="w-full bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white h-12"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Gerando com IA...</span>
                <span className="ml-2 text-xs opacity-70">~3-7s</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Script
              </>
            )}
          </Button>

          {generating && (
            <div className="space-y-2">
              <AIProgressBar />
              <p className="text-xs text-center text-[#94A3B8]">
                Buscando contexto → Selecionando tom → Gerando script
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === RESULT SECTION === */}
      {result && !result.startsWith('Erro') && parsed ? (
        <div className="space-y-4">
          {/* Title & Category */}
          {parsed.title && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{parsed.title}</h2>
                    {parsed.suggested_category && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          Categoria sugerida: {parsed.suggested_category}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge className="bg-[#1D4ED8]/20 text-[#1D4ED8] shrink-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    IA
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Context Description */}
          {parsed.context_description && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1D4ED8]" />
                  Quando usar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {parsed.context_description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Script Content with Tone Tabs */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#1D4ED8]" />
                  Script
                </CardTitle>
              </div>
              {hasToneVariations && (
                <div className="flex gap-1 mt-3">
                  {[
                    { key: 'casual' as const, label: 'Casual', available: !!parsed.content },
                    { key: 'formal' as const, label: 'Formal', available: !!parsed.content_formal },
                    { key: 'direct' as const, label: 'Direto', available: !!parsed.content_direct },
                  ]
                    .filter((t) => t.available)
                    .map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          activeTab === t.key
                            ? 'bg-[#1D4ED8] text-white'
                            : 'bg-[#131B35] text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="bg-[#131B35] rounded-lg p-4 mb-3">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {getActiveContent()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopy(getActiveContent(), 'script')}
                  size="sm"
                  className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white"
                >
                  {copied === 'script' ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5" /> Copiado!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Script</>
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saved}
                  size="sm"
                  variant="outline"
                  className="border-[#1E2A52] text-white hover:bg-[#131B35]"
                >
                  {saved ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5" /> Salvo!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5 mr-1.5" /> Salvar</>
                  )}
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  size="sm"
                  variant="outline"
                  className="border-[#1E2A52] text-white hover:bg-[#131B35]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {parsed.tags && parsed.tags.length > 0 && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#1D4ED8]" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsed.tags.map((tag, i) => (
                    <Badge
                      key={i}
                      className="bg-[#131B35] text-gray-300 border border-[#1E2A52]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Objection Keywords */}
          {parsed.objection_keywords && parsed.objection_keywords.length > 0 && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Objeções que este script combate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {parsed.objection_keywords.map((keyword, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-amber-400 text-xs">&#x2022;</span>
                      <span className="text-sm text-gray-300">&ldquo;{keyword}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : result ? (
        /* Fallback for plain text or error */
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Script Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#131B35] rounded-lg p-4 mb-4">
              <p className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed">
                {result}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCopy(result, 'main')}
                className="flex-1 bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white"
              >
                {copied === 'main' ? (
                  <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copiar Script</>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saved}
                variant="outline"
                className="border-[#1E2A52] text-white hover:bg-[#131B35]"
              >
                {saved ? (
                  <><Check className="w-4 h-4 mr-2" /> Salvo!</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar</>
                )}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="outline"
                className="border-[#1E2A52] text-white hover:bg-[#131B35]"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
