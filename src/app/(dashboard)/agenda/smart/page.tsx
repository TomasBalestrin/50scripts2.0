'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  Phone,
  DollarSign,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Target,
  Loader2,
} from 'lucide-react';

interface SmartLead {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  expected_value: number | null;
  next_followup_at: string | null;
  last_contact_at: string | null;
  priority_score: number;
  closing_probability: number;
  reasons: string[];
  suggested_script: {
    id: string;
    title: string;
    content: string;
  } | null;
}

interface BestHour {
  hour: number;
  label: string;
  conversion_rate: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: '#3B82F6' },
  abordado: { label: 'Abordado', color: '#8B5CF6' },
  qualificado: { label: 'Qualificado', color: '#F59E0B' },
  proposta: { label: 'Proposta', color: '#F97316' },
};

export default function SmartAgendaPage() {
  const [leads, setLeads] = useState<SmartLead[]>([]);
  const [bestHours, setBestHours] = useState<BestHour[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agenda/smart');
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
          setBestHours(data.best_hours || []);
          setTotalValue(data.total_pipeline_value || 0);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // Register usage (fire-and-forget)
    fetch(`/api/scripts/${id}/use`, { method: 'POST' }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#1D4ED8]" />
            Agenda Inteligente
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Leads priorizados por probabilidade de fechamento
          </p>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400">Copilot</Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-white">{leads.length}</p>
            <p className="text-xs text-gray-400">Leads Priorizados</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-gray-400">Pipeline Total</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-[#1D4ED8]">
              {leads.filter((l) => l.closing_probability > 50).length}
            </p>
            <p className="text-xs text-gray-400">Alta Probabilidade</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {leads.filter((l) => l.reasons.includes('Follow-up atrasado')).length}
            </p>
            <p className="text-xs text-gray-400">Atrasados</p>
          </CardContent>
        </Card>
      </div>

      {/* Best Hours */}
      {bestHours.length > 0 && (
        <Card className="bg-[#0A0F1E] border-[#131B35] mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Melhores Horários para Vender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {bestHours.map((h, i) => (
                <div
                  key={h.hour}
                  className="flex-1 bg-[#131B35] rounded-lg p-3 text-center"
                >
                  <p className="text-lg font-bold text-white">{h.label}</p>
                  <p className="text-sm text-green-400">{h.conversion_rate}% conversão</p>
                  {i === 0 && (
                    <Badge className="mt-1 bg-green-500/20 text-green-400 text-[10px]">
                      Melhor
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prioritized Leads */}
      <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Target className="w-5 h-5 text-[#1D4ED8]" />
        Leads Priorizados
      </h2>

      {leads.length === 0 ? (
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-6 text-center text-gray-400">
            <p>Nenhum lead ativo no pipeline.</p>
            <Button
              className="mt-3 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
              onClick={() => router.push('/pipeline')}
            >
              Ir para Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => {
            const stageInfo = STAGE_LABELS[lead.stage] || { label: lead.stage, color: '#6B7280' };
            const isOverdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();

            return (
              <Card
                key={lead.id}
                className={`bg-[#0A0F1E] border-[#131B35] transition-all hover:border-[#1E2A52] ${
                  isOverdue ? 'border-l-2 border-l-red-500' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Priority rank */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#131B35] text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{lead.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            className="text-[10px]"
                            style={{
                              backgroundColor: `${stageInfo.color}20`,
                              color: stageInfo.color,
                            }}
                          >
                            {stageInfo.label}
                          </Badge>
                          {lead.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {lead.expected_value && (
                        <p className="text-sm font-semibold text-green-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          R$ {lead.expected_value.toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Closing probability bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Probabilidade de Fechamento</span>
                      <span
                        className={`text-xs font-bold ${
                          lead.closing_probability > 60
                            ? 'text-green-400'
                            : lead.closing_probability > 30
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {lead.closing_probability}%
                      </span>
                    </div>
                    <Progress
                      value={lead.closing_probability}
                      className="h-1.5"
                    />
                  </div>

                  {/* Reasons */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {lead.reasons.map((reason, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          reason.includes('atrasado')
                            ? 'bg-red-500/20 text-red-400'
                            : reason.includes('fechamento')
                            ? 'bg-green-500/20 text-green-400'
                            : reason.includes('valor')
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-[#131B35] text-gray-400'
                        }`}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>

                  {/* Suggested Script */}
                  {lead.suggested_script && (
                    <div className="bg-[#131B35] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Script sugerido:</p>
                      <p className="text-sm font-medium text-white mb-1">
                        {lead.suggested_script.title}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {lead.suggested_script.content}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs h-7"
                          onClick={() =>
                            handleCopy(lead.suggested_script!.content, lead.suggested_script!.id)
                          }
                        >
                          {copiedId === lead.suggested_script.id ? (
                            <><Check className="w-3 h-3 mr-1" /> Copiado!</>
                          ) : (
                            <><Copy className="w-3 h-3 mr-1" /> Copiar</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#1E2A52] text-gray-300 hover:bg-[#1E2A52] text-xs h-7"
                          onClick={() => router.push(`/scripts/${lead.suggested_script!.id}`)}
                        >
                          Ver Script
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#1E2A52] text-gray-300 hover:bg-[#1E2A52] text-xs h-7 ml-auto"
                          onClick={() => router.push(`/pipeline/${lead.id}`)}
                        >
                          Detalhes <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up info */}
                  {lead.next_followup_at && (
                    <div className="flex items-center gap-1 mt-2">
                      {isOverdue ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-gray-500" />
                      )}
                      <span
                        className={`text-xs ${
                          isOverdue ? 'text-red-400' : 'text-gray-500'
                        }`}
                      >
                        Follow-up:{' '}
                        {new Date(lead.next_followup_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
