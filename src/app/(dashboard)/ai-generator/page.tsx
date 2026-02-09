'use client';

import { useState, useEffect } from 'react';
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

export default function AIGeneratorPage() {
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<string>('casual');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'casual' | 'formal' | 'direct'>('casual');

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);

      const creditsRes = await fetch('/api/ai/credits');
      const creditsData = await creditsRes.json();
      setCreditsRemaining(creditsData.credits_remaining);
    }
    load();
  }, []);

  const handleGenerate = async () => {
    if (!categoryId || context.length < 10) return;
    setGenerating(true);
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
        setCreditsRemaining(data.credits_remaining);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch {
      setResult('Erro ao conectar com a IA. Tente novamente.');
    }
    setGenerating(false);
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
          <Sparkles className="w-6 h-6 text-[#C9A84C]" />
          Gerador de Scripts IA
        </h1>
        {creditsRemaining !== null && (
          <Badge className="bg-[#1A3050] text-white">
            {creditsRemaining === -1 ? '∞' : creditsRemaining} créditos
          </Badge>
        )}
      </div>

      <Card className="bg-[#0F1D32] border-[#1A3050] mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Trilha / Categoria</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-[#1A3050] border-[#363660] text-white">
                <SelectValue placeholder="Selecione a trilha" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A3050] border-[#363660]">
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
              className="bg-[#1A3050] border-[#363660] text-white min-h-[100px]"
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
                      ? 'bg-[#C9A84C] text-white'
                      : 'border-[#363660] text-gray-400 hover:bg-[#1A3050]'
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
            className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white h-12"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* === RESULT SECTION === */}
      {result && !result.startsWith('Erro') && parsed ? (
        <div className="space-y-4">
          {/* Title & Category */}
          {parsed.title && (
            <Card className="bg-[#0F1D32] border-[#1A3050]">
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
                  <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] shrink-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    IA
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Context Description */}
          {parsed.context_description && (
            <Card className="bg-[#0F1D32] border-[#1A3050]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C9A84C]" />
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
          <Card className="bg-[#0F1D32] border-[#1A3050]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#C9A84C]" />
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
                            ? 'bg-[#C9A84C] text-white'
                            : 'bg-[#1A3050] text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="bg-[#1A3050] rounded-lg p-4 mb-3">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {getActiveContent()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopy(getActiveContent(), 'script')}
                  size="sm"
                  className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white"
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
                  className="border-[#363660] text-white hover:bg-[#1A3050]"
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
                  className="border-[#363660] text-white hover:bg-[#1A3050]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {parsed.tags && parsed.tags.length > 0 && (
            <Card className="bg-[#0F1D32] border-[#1A3050]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#C9A84C]" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsed.tags.map((tag, i) => (
                    <Badge
                      key={i}
                      className="bg-[#1A3050] text-gray-300 border border-[#363660]"
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
            <Card className="bg-[#0F1D32] border-[#1A3050]">
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
        <Card className="bg-[#0F1D32] border-[#1A3050]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Script Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#1A3050] rounded-lg p-4 mb-4">
              <p className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed">
                {result}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCopy(result, 'main')}
                className="flex-1 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white"
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
                className="border-[#363660] text-white hover:bg-[#1A3050]"
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
                className="border-[#363660] text-white hover:bg-[#1A3050]"
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
