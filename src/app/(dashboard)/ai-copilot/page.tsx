'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, Copy, Check, Loader2,
  MessageSquare, Target, Lightbulb, AlertTriangle,
  TrendingUp, Flame, Eye, Ban,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  stage: string;
}

interface CopilotAnalysis {
  analysis?: {
    funnel_stage?: string;
    interest_level?: string;
    detected_objections?: string[];
    buying_signals?: string[];
    missed_opportunities?: string[];
  };
  suggested_message?: {
    casual?: string;
    formal?: string;
    reasoning?: string;
    mental_trigger?: string;
    what_not_to_do?: string;
  };
}

const FUNNEL_STAGE_LABELS: Record<string, { label: string; color: string }> = {
  abordagem: { label: 'Abordagem', color: '#3B82F6' },
  qualificacao: { label: 'Qualificação', color: '#8B5CF6' },
  'qualificação': { label: 'Qualificação', color: '#8B5CF6' },
  apresentacao: { label: 'Apresentação', color: '#F59E0B' },
  'apresentação': { label: 'Apresentação', color: '#F59E0B' },
  negociacao: { label: 'Negociação', color: '#EF4444' },
  'negociação': { label: 'Negociação', color: '#EF4444' },
  fechamento: { label: 'Fechamento', color: '#10B981' },
  'pós-venda': { label: 'Pós-venda', color: '#06B6D4' },
  'pos-venda': { label: 'Pós-venda', color: '#06B6D4' },
};

const INTEREST_LABELS: Record<string, { label: string; color: string; icon: typeof Flame }> = {
  quente: { label: 'Quente', color: '#EF4444', icon: Flame },
  morno: { label: 'Morno', color: '#F59E0B', icon: TrendingUp },
  frio: { label: 'Frio', color: '#3B82F6', icon: Eye },
};

export default function AICopilotPage() {
  const [conversation, setConversation] = useState('');
  const [leadId, setLeadId] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [messageTab, setMessageTab] = useState<'casual' | 'formal'>('casual');

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

  // Try to parse JSON from result
  function tryParseJSON(text: string): CopilotAnalysis | null {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
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

  // Fallback markdown renderer for non-JSON responses
  const renderMarkdown = (text: string) => {
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

    const headerRegex = /^#{1,3}\s+(.+)$/gm;
    const headerMatches = [...text.matchAll(headerRegex)];

    if (headerMatches.length > 0) {
      for (let i = 0; i < headerMatches.length; i++) {
        const title = headerMatches[i][1].replace(/\*\*/g, '').replace(/:$/, '').trim();
        const startIdx = headerMatches[i].index! + headerMatches[i][0].length;
        const endIdx = i < headerMatches.length - 1 ? headerMatches[i + 1].index! : text.length;
        const content = text.slice(startIdx, endIdx).trim();
        if (content) sections.push({ title, content, icon: getIcon(title), copyable: isCopyable(title) });
      }
    }

    if (sections.length === 0) {
      const parts = text.split(/\*\*(.*?)\*\*/g);
      let currentTitle = '';
      let currentContent = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (i % 2 === 1) {
          if (currentTitle && currentContent) {
            sections.push({ title: currentTitle, content: currentContent.trim(), icon: getIcon(currentTitle), copyable: isCopyable(currentTitle) });
          }
          currentTitle = part.replace(/:$/, '');
          currentContent = '';
        } else {
          currentContent += part;
        }
      }
      if (currentTitle && currentContent) {
        sections.push({ title: currentTitle, content: currentContent.trim(), icon: getIcon(currentTitle), copyable: isCopyable(currentTitle) });
      }
    }

    if (sections.length === 0) {
      sections.push({ title: 'Análise', content: text, icon: <Bot className="w-4 h-4" />, copyable: true });
    }

    return sections;
  };

  const getActiveMessage = (): string => {
    if (!parsed?.suggested_message) return '';
    return messageTab === 'formal'
      ? (parsed.suggested_message.formal || parsed.suggested_message.casual || '')
      : (parsed.suggested_message.casual || parsed.suggested_message.formal || '');
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#1D4ED8]" />
          IA Copilot
        </h1>
        <Badge className="bg-amber-500/20 text-amber-400">Copilot</Badge>
      </div>

      {/* Input Section */}
      <Card className="bg-[#0A0F1E] border-[#131B35] mb-6">
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
                <SelectTrigger className="bg-[#131B35] border-[#1E2A52] text-white">
                  <SelectValue placeholder="Selecionar lead para contexto" />
                </SelectTrigger>
                <SelectContent className="bg-[#131B35] border-[#1E2A52]">
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
            className="bg-[#131B35] border-[#1E2A52] text-white min-h-[200px] font-mono text-sm"
          />

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || conversation.length < 10}
            className="w-full bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white h-12"
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

      {/* === RESULT SECTION === */}
      {result && !result.startsWith('Erro') && parsed ? (
        <div className="space-y-4">
          {/* Analysis Card */}
          {parsed.analysis && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#1D4ED8]" />
                  Análise da Conversa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Funnel Stage & Interest Level */}
                <div className="flex flex-wrap gap-2">
                  {parsed.analysis.funnel_stage && (() => {
                    const stage = FUNNEL_STAGE_LABELS[parsed.analysis!.funnel_stage!.toLowerCase()] || {
                      label: parsed.analysis!.funnel_stage,
                      color: '#94A3B8',
                    };
                    return (
                      <Badge
                        className="px-3 py-1 text-white text-xs"
                        style={{ backgroundColor: stage.color + '30', borderColor: stage.color, border: '1px solid' }}
                      >
                        Estágio: {stage.label}
                      </Badge>
                    );
                  })()}

                  {parsed.analysis.interest_level && (() => {
                    const interest = INTEREST_LABELS[parsed.analysis!.interest_level!.toLowerCase()] || {
                      label: parsed.analysis!.interest_level,
                      color: '#94A3B8',
                      icon: Eye,
                    };
                    const InterestIcon = interest.icon;
                    return (
                      <Badge
                        className="px-3 py-1 text-white text-xs flex items-center gap-1"
                        style={{ backgroundColor: interest.color + '30', borderColor: interest.color, border: '1px solid' }}
                      >
                        <InterestIcon className="w-3 h-3" />
                        Lead {interest.label}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Buying Signals */}
                {parsed.analysis.buying_signals && parsed.analysis.buying_signals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-400 mb-1.5 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Sinais de Compra
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.analysis.buying_signals.map((signal, i) => (
                        <Badge key={i} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Objections */}
                {parsed.analysis.detected_objections && parsed.analysis.detected_objections.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Objeções Detectadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.analysis.detected_objections.map((obj, i) => (
                        <Badge key={i} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missed Opportunities */}
                {parsed.analysis.missed_opportunities && parsed.analysis.missed_opportunities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-400 mb-1.5 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Oportunidades Perdidas
                    </p>
                    <div className="space-y-1">
                      {parsed.analysis.missed_opportunities.map((opp, i) => (
                        <p key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">-</span>
                          {opp}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Suggested Message Card */}
          {parsed.suggested_message && (parsed.suggested_message.casual || parsed.suggested_message.formal) && (
            <Card className="bg-[#0A0F1E] border-[#1D4ED8]/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#1D4ED8]" />
                    Próxima Mensagem
                  </CardTitle>
                </div>
                {parsed.suggested_message.casual && parsed.suggested_message.formal && (
                  <div className="flex gap-1 mt-3">
                    <button
                      onClick={() => setMessageTab('casual')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        messageTab === 'casual'
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-[#131B35] text-gray-400 hover:text-white'
                      }`}
                    >
                      Casual
                    </button>
                    <button
                      onClick={() => setMessageTab('formal')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        messageTab === 'formal'
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-[#131B35] text-gray-400 hover:text-white'
                      }`}
                    >
                      Formal
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="bg-[#131B35] rounded-lg p-4 mb-3">
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {getActiveMessage()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCopy(getActiveMessage(), 'message')}
                  className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white"
                >
                  {copiedSection === 'message' ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5" /> Copiado!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Mensagem</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Reasoning Card */}
          {parsed.suggested_message?.reasoning && (
            <Card className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#1D4ED8]" />
                  Por que essa abordagem?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {parsed.suggested_message.reasoning}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Mental Trigger Card */}
          {parsed.suggested_message?.mental_trigger && (
            <Card className="bg-[#0A0F1E] border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-purple-400" />
                  Gatilho Mental
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-200 leading-relaxed">
                  {parsed.suggested_message.mental_trigger}
                </p>
              </CardContent>
            </Card>
          )}

          {/* What NOT to do Card */}
          {parsed.suggested_message?.what_not_to_do && (
            <Card className="bg-[#0A0F1E] border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  O que NÃO fazer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-200/80 leading-relaxed">
                  {parsed.suggested_message.what_not_to_do}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : result ? (
        /* Fallback: markdown/plain text rendering */
        <div className="space-y-4">
          {renderMarkdown(result).map((section, i) => (
            <Card key={i} className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <span className="text-[#1D4ED8]">{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#131B35] rounded-lg p-4 mb-3">
                  <div className="text-gray-200 text-sm leading-relaxed space-y-2">
                    {section.content.split('\n').map((line, j) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
                      if (trimmed.startsWith('- ') || trimmed.startsWith('\u2022 ')) {
                        return (
                          <div key={j} className="flex gap-2 pl-2">
                            <span className="text-[#1D4ED8] mt-1">&bull;</span>
                            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-\u2022]\s*/, '') }} />
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
                    className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white"
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
      ) : null}
    </div>
  );
}
