'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ScriptCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Check, Save, RefreshCw, Loader2 } from 'lucide-react';

export default function AIGeneratorPage() {
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<string>('casual');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!result || !categoryId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('scripts').insert({
      category_id: categoryId,
      title: `Script IA - ${new Date().toLocaleDateString('pt-BR')}`,
      content: result,
      context_description: context,
      is_ai_generated: true,
      generated_by_user_id: user.id,
      min_plan: 'premium',
      display_order: 999,
    });
    setSaved(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#E94560]" />
          Gerador de Scripts IA
        </h1>
        {creditsRemaining !== null && (
          <Badge className="bg-[#252542] text-white">
            {creditsRemaining === -1 ? '∞' : creditsRemaining} créditos
          </Badge>
        )}
      </div>

      <Card className="bg-[#1A1A2E] border-[#252542] mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Trilha / Categoria</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-[#252542] border-[#363660] text-white">
                <SelectValue placeholder="Selecione a trilha" />
              </SelectTrigger>
              <SelectContent className="bg-[#252542] border-[#363660]">
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
              className="bg-[#252542] border-[#363660] text-white min-h-[100px]"
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
                      ? 'bg-[#E94560] text-white'
                      : 'border-[#363660] text-gray-400 hover:bg-[#252542]'
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
            className="w-full bg-[#E94560] hover:bg-[#d63d56] text-white h-12"
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

      {result && (
        <Card className="bg-[#1A1A2E] border-[#252542]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Script Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#252542] rounded-lg p-4 mb-4">
              <pre className="whitespace-pre-wrap text-gray-200 text-sm font-sans leading-relaxed">
                {result}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 bg-[#E94560] hover:bg-[#d63d56] text-white"
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copiar Script</>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saved}
                variant="outline"
                className="border-[#363660] text-white hover:bg-[#252542]"
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
                className="border-[#363660] text-white hover:bg-[#252542]"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
