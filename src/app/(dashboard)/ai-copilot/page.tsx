'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Copy, Check, Loader2, MessageSquare, Target, Lightbulb } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  stage: string;
}

export default function AICopilotPage() {
  const [conversation, setConversation] = useState('');
  const [leadId, setLeadId] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await fetch('/api/leads');
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch {
        // ignore
      }
    }
    loadLeads();
  }, []);

  const handleAnalyze = async () => {
    if (conversation.length < 10) return;
    setAnalyzing(true);
    setResult('');

    try {
      const res = await fetch('/api/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation,
          lead_id: leadId || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data.analysis);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch {
      setResult('Erro ao conectar com a IA. Tente novamente.');
    }
    setAnalyzing(false);
  };

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Parse result sections - handles markdown headers (## or **bold**) and numbered lists
  const parseResult = (text: string) => {
    const sections: Array<{ title: string; content: string; icon: React.ReactNode; copyable: boolean }> = [];

    const getIcon = (title: string) => {
      const t = title.toLowerCase();
      if (t.includes('análise') || t.includes('analise')) return <Target className="w-4 h-4" />;
      if (t.includes('mensagem') || t.includes('próxima') || t.includes('proxima') || t.includes('sugerid')) return <MessageSquare className="w-4 h-4" />;
      if (t.includes('alternativa')) return <MessageSquare className="w-4 h-4" />;
      if (t.includes('gatilho') || t.includes('oportunidade')) return <Lightbulb className="w-4 h-4" />;
      return <Lightbulb className="w-4 h-4" />;
    };

    const isCopyable = (title: string) => {
      const t = title.toLowerCase();
      return t.includes('mensagem') || t.includes('alternativa') || t.includes('próxima') || t.includes('proxima') || t.includes('sugerid');
    };

    // Try splitting by markdown ## headers first
    const headerRegex = /^#{1,3}\s+(.+)$/gm;
    const headerMatches = [...text.matchAll(headerRegex)];

    if (headerMatches.length > 0) {
      for (let i = 0; i < headerMatches.length; i++) {
        const title = headerMatches[i][1].replace(/\*\*/g, '').replace(/:$/, '').trim();
        const startIdx = headerMatches[i].index! + headerMatches[i][0].length;
        const endIdx = i < headerMatches.length - 1 ? headerMatches[i + 1].index! : text.length;
        const content = text.slice(startIdx, endIdx).trim();
        if (content) {
          sections.push({ title, content, icon: getIcon(title), copyable: isCopyable(title) });
        }
      }
    }

    // Fallback: try **bold** headers
    if (sections.length === 0) {
      const parts = text.split(/\*\*(.*?)\*\*/g);
      let currentTitle = '';
      let currentContent = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (i % 2 === 1) {
          if (currentTitle && currentContent) {
            sections.push({
              title: currentTitle,
              content: currentContent.trim(),
              icon: getIcon(currentTitle),
              copyable: isCopyable(currentTitle),
            });
          }
          currentTitle = part.replace(/:$/, '');
          currentContent = '';
        } else {
          currentContent += part;
        }
      }
      if (currentTitle && currentContent) {
        sections.push({
          title: currentTitle,
          content: currentContent.trim(),
          icon: getIcon(currentTitle),
          copyable: isCopyable(currentTitle),
        });
      }
    }

    // Fallback: try numbered sections (1. Title\n content)
    if (sections.length === 0) {
      const numberedRegex = /^\d+\.\s*\*?\*?(.+?)\*?\*?\s*[:：]?\s*$/gm;
      const numberedMatches = [...text.matchAll(numberedRegex)];
      if (numberedMatches.length > 0) {
        for (let i = 0; i < numberedMatches.length; i++) {
          const title = numberedMatches[i][1].trim();
          const startIdx = numberedMatches[i].index! + numberedMatches[i][0].length;
          const endIdx = i < numberedMatches.length - 1 ? numberedMatches[i + 1].index! : text.length;
          const content = text.slice(startIdx, endIdx).trim();
          if (content) {
            sections.push({ title, content, icon: getIcon(title), copyable: isCopyable(title) });
          }
        }
      }
    }

    // Final fallback: show full text as single analysis card
    if (sections.length === 0) {
      sections.push({
        title: 'Análise',
        content: text,
        icon: <Bot className="w-4 h-4" />,
        copyable: true,
      });
    }

    return sections;
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#C9A84C]" />
          IA Copilot
        </h1>
        <Badge className="bg-amber-500/20 text-amber-400">Copilot</Badge>
      </div>

      {/* Input Section */}
      <Card className="bg-[#0F1D32] border-[#1A3050] mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Cole a conversa</CardTitle>
          <p className="text-sm text-gray-400">
            Cole a conversa do WhatsApp e a IA irá analisar e sugerir a próxima mensagem
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {leads.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Lead (opcional)</label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="bg-[#1A3050] border-[#363660] text-white">
                  <SelectValue placeholder="Selecionar lead para contexto" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A3050] border-[#363660]">
                  <SelectItem value="" className="text-gray-400">
                    Nenhum lead específico
                  </SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id} className="text-white">
                      {lead.name} ({lead.stage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Textarea
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
            placeholder={`Cole a conversa aqui...\n\nExemplo:\nVocê: Oi Maria, tudo bem? Vi que você se interessou pelo nosso curso...\nMaria: Oi! Sim, achei interessante, mas achei o preço um pouco alto...\nVocê: Entendo! E se eu te mostrar que...`}
            className="bg-[#1A3050] border-[#363660] text-white min-h-[200px] font-mono text-sm"
          />

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || conversation.length < 10}
            className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white h-12"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando conversa...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analisar e Sugerir Próxima Mensagem
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Section */}
      {result && (
        <div className="space-y-4">
          {parseResult(result).map((section, i) => (
            <Card key={i} className="bg-[#0F1D32] border-[#1A3050]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-[#C9A84C]">{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#1A3050] rounded-lg p-4 mb-3">
                  <div className="text-gray-200 text-sm leading-relaxed space-y-2">
                    {section.content.split('\n').map((line, j) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      // Bold text
                      const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
                      // Bullet points
                      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                        return (
                          <div key={j} className="flex gap-2 pl-2">
                            <span className="text-[#C9A84C] mt-1">•</span>
                            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
                          </div>
                        );
                      }
                      return <p key={j} dangerouslySetInnerHTML={{ __html: formatted }} />;
                    })}
                  </div>
                </div>
                {section.copyable && (
                  <Button
                    size="sm"
                    onClick={() => handleCopy(section.content, section.title)}
                    className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white"
                  >
                    {copiedSection === section.title ? (
                      <><Check className="w-3 h-3 mr-1" /> Copiado!</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" /> Copiar Mensagem</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
