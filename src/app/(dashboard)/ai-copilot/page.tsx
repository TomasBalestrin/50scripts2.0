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

  // Parse result sections
  const parseResult = (text: string) => {
    const sections: Array<{ title: string; content: string; icon: React.ReactNode; copyable: boolean }> = [];

    // Try to extract sections from markdown-style headers
    const parts = text.split(/\*\*(.*?)\*\*/g);
    let currentTitle = '';
    let currentContent = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (i % 2 === 1) {
        // This is a bold header
        if (currentTitle && currentContent) {
          sections.push({
            title: currentTitle,
            content: currentContent.trim(),
            icon: currentTitle.toLowerCase().includes('análise') ? <Target className="w-4 h-4" /> :
                  currentTitle.toLowerCase().includes('mensagem') ? <MessageSquare className="w-4 h-4" /> :
                  currentTitle.toLowerCase().includes('alternativa') ? <MessageSquare className="w-4 h-4" /> :
                  <Lightbulb className="w-4 h-4" />,
            copyable: currentTitle.toLowerCase().includes('mensagem') || currentTitle.toLowerCase().includes('alternativa'),
          });
        }
        currentTitle = part.replace(':', '');
        currentContent = '';
      } else {
        currentContent += part;
      }
    }

    // Add last section
    if (currentTitle && currentContent) {
      sections.push({
        title: currentTitle,
        content: currentContent.trim(),
        icon: currentTitle.toLowerCase().includes('análise') ? <Target className="w-4 h-4" /> :
              currentTitle.toLowerCase().includes('mensagem') ? <MessageSquare className="w-4 h-4" /> :
              <Lightbulb className="w-4 h-4" />,
        copyable: currentTitle.toLowerCase().includes('mensagem') || currentTitle.toLowerCase().includes('alternativa'),
      });
    }

    // Fallback: if no sections parsed, return full text
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
          <Bot className="w-6 h-6 text-[#E94560]" />
          IA Copilot
        </h1>
        <Badge className="bg-amber-500/20 text-amber-400">Copilot</Badge>
      </div>

      {/* Input Section */}
      <Card className="bg-[#1A1A2E] border-[#252542] mb-6">
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
                <SelectTrigger className="bg-[#252542] border-[#363660] text-white">
                  <SelectValue placeholder="Selecionar lead para contexto" />
                </SelectTrigger>
                <SelectContent className="bg-[#252542] border-[#363660]">
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
            className="bg-[#252542] border-[#363660] text-white min-h-[200px] font-mono text-sm"
          />

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || conversation.length < 10}
            className="w-full bg-[#E94560] hover:bg-[#d63d56] text-white h-12"
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
            <Card key={i} className="bg-[#1A1A2E] border-[#252542]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-[#E94560]">{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#252542] rounded-lg p-4 mb-3">
                  <pre className="whitespace-pre-wrap text-gray-200 text-sm font-sans leading-relaxed">
                    {section.content}
                  </pre>
                </div>
                {section.copyable && (
                  <Button
                    size="sm"
                    onClick={() => handleCopy(section.content, section.title)}
                    className="bg-[#E94560] hover:bg-[#d63d56] text-white"
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
