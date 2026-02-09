'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lead, LeadStage, ConversationSnippet, Script, ScriptUsage } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Phone,
  DollarSign,
  Calendar,
  Clock,
  MessageSquare,
  StickyNote,
  FileText,
  Lightbulb,
  Trash2,
  Send,
  User,
  Users,
  CalendarClock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'novo', label: 'Novo', color: '#3B82F6' },
  { key: 'abordado', label: 'Abordado', color: '#8B5CF6' },
  { key: 'qualificado', label: 'Qualificado', color: '#F59E0B' },
  { key: 'proposta', label: 'Proposta', color: '#F97316' },
  { key: 'fechado', label: 'Fechado', color: '#10B981' },
  { key: 'perdido', label: 'Perdido', color: '#EF4444' },
];

interface ScriptUsageWithScript extends ScriptUsage {
  scripts?: {
    id: string;
    title: string;
    category_id: string;
    category?: {
      id: string;
      name: string;
      slug: string;
      icon: string;
      color: string;
    };
  };
}

interface RecommendedScript extends Script {
  is_locked: boolean;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  // Lead state
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conversation state
  const [snippetText, setSnippetText] = useState('');
  const [snippetSpeaker, setSnippetSpeaker] = useState<'user' | 'lead'>('user');
  const [sendingSnippet, setSendingSnippet] = useState(false);

  // Follow-up state
  const [followupDate, setFollowupDate] = useState('');
  const [followupSaving, setFollowupSaving] = useState(false);

  // Script usage history
  const [scriptUsages, setScriptUsages] = useState<ScriptUsageWithScript[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(true);

  // Recommended scripts
  const [recommendations, setRecommendations] = useState<RecommendedScript[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Stage change loading
  const [stageChanging, setStageChanging] = useState(false);

  // -------------------------------------------------------------------
  // Fetch lead data
  // -------------------------------------------------------------------
  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) {
        setError('Lead nao encontrado');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const fetchedLead = data.lead as Lead;
      setLead(fetchedLead);
      setNotes(fetchedLead.notes || '');
      if (fetchedLead.next_followup_at) {
        // Convert ISO to datetime-local format
        const dt = new Date(fetchedLead.next_followup_at);
        const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setFollowupDate(localIso);
      }
      setError(null);
    } catch {
      setError('Erro ao carregar lead');
    }
    setLoading(false);
  }, [leadId]);

  // -------------------------------------------------------------------
  // Fetch script usage history for this lead
  // -------------------------------------------------------------------
  const fetchScriptUsages = useCallback(async () => {
    setUsagesLoading(true);
    try {
      const res = await fetch(`/api/scripts/history?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setScriptUsages(data.usages || []);
      }
    } catch {
      // ignore
    }
    setUsagesLoading(false);
  }, [leadId]);

  // -------------------------------------------------------------------
  // Fetch recommended scripts
  // -------------------------------------------------------------------
  const fetchRecommendations = useCallback(async () => {
    setRecsLoading(true);
    try {
      const res = await fetch('/api/scripts/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.scripts || []);
      }
    } catch {
      // ignore
    }
    setRecsLoading(false);
  }, []);

  useEffect(() => {
    fetchLead();
    fetchScriptUsages();
    fetchRecommendations();
  }, [fetchLead, fetchScriptUsages, fetchRecommendations]);

  // -------------------------------------------------------------------
  // Handle stage change
  // -------------------------------------------------------------------
  const handleStageChange = async (newStage: string) => {
    if (!lead || lead.stage === newStage) return;
    setStageChanging(true);
    // Optimistic update
    setLead((prev) => (prev ? { ...prev, stage: newStage as LeadStage } : prev));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      } else {
        // Revert
        fetchLead();
      }
    } catch {
      fetchLead();
    }
    setStageChanging(false);
  };

  // -------------------------------------------------------------------
  // Handle notes auto-save on blur
  // -------------------------------------------------------------------
  const handleNotesBlur = async () => {
    if (!lead || notes === (lead.notes || '')) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch {
      // ignore
    }
    setNotesSaving(false);
  };

  // -------------------------------------------------------------------
  // Handle adding a conversation snippet
  // -------------------------------------------------------------------
  const handleAddSnippet = async () => {
    if (!snippetText.trim() || !lead) return;
    setSendingSnippet(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet_text: snippetText.trim(),
          speaker: snippetSpeaker,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setSnippetText('');
      }
    } catch {
      // ignore
    }
    setSendingSnippet(false);
  };

  // -------------------------------------------------------------------
  // Handle follow-up date save
  // -------------------------------------------------------------------
  const handleFollowupSave = async () => {
    if (!lead) return;
    setFollowupSaving(true);
    try {
      const isoDate = followupDate ? new Date(followupDate).toISOString() : null;
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_followup_at: isoDate }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch {
      // ignore
    }
    setFollowupSaving(false);
  };

  // -------------------------------------------------------------------
  // Handle delete
  // -------------------------------------------------------------------
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/pipeline');
        return;
      }
    } catch {
      // ignore
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
  };

  // -------------------------------------------------------------------
  // Format date helper
  // -------------------------------------------------------------------
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageInfo = (stageKey: LeadStage) =>
    STAGES.find((s) => s.key === stageKey) || STAGES[0];

  // -------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#1D4ED8] animate-spin" />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------
  if (error || !lead) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-white text-lg">{error || 'Lead nao encontrado'}</p>
          <Button
            onClick={() => router.push('/pipeline')}
            variant="outline"
            className="border-[#131B35] text-gray-400 hover:text-white hover:bg-[#131B35]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Pipeline
          </Button>
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(lead.stage);
  const conversationHistory: ConversationSnippet[] = Array.isArray(lead.conversation_history)
    ? lead.conversation_history
    : [];
  const isOverdue =
    lead.next_followup_at && new Date(lead.next_followup_at) < new Date();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back button + Delete */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => router.push('/pipeline')}
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-[#131B35]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Pipeline
        </Button>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0F1E] border-[#131B35]">
            <DialogHeader>
              <DialogTitle className="text-white">Confirmar Exclusao</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-gray-400 mb-6">
                Tem certeza que deseja excluir o lead <strong className="text-white">{lead.name}</strong>?
                Esta acao nao pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="border-[#131B35] text-gray-400 hover:text-white hover:bg-[#131B35]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Header */}
      <Card className="bg-[#0A0F1E] border-[#131B35] mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
                <Badge
                  className="text-white text-xs font-medium px-3 py-1"
                  style={{ backgroundColor: stageInfo.color }}
                >
                  {stageInfo.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {lead.phone && (
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.expected_value != null && lead.expected_value > 0 && (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <DollarSign className="w-4 h-4" />
                    <span>R$ {lead.expected_value.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Criado em {formatDate(lead.created_at)}</span>
                </div>
              </div>

              {isOverdue && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Follow-up atrasado!</span>
                </div>
              )}
            </div>

            {/* Stage Transition Dropdown */}
            <div className="w-full md:w-56 shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Mudar Estagio</label>
              <Select value={lead.stage} onValueChange={handleStageChange}>
                <SelectTrigger className="bg-[#131B35] border-[#1E2A52] text-white h-10">
                  <SelectValue placeholder="Selecione o estagio" />
                </SelectTrigger>
                <SelectContent className="bg-[#131B35] border-[#1E2A52]">
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-white hover:bg-[#1E2A52]">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stageChanging && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conversation + Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversation History */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#1D4ED8]" />
                Historico de Conversa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Conversation list */}
              <ScrollArea className="h-[300px] mb-4">
                {conversationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma conversa registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-3">
                    {conversationHistory.map((snippet, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${
                          snippet.speaker === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {snippet.speaker === 'lead' && (
                          <div className="w-7 h-7 rounded-full bg-[#131B35] flex items-center justify-center shrink-0 mt-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            snippet.speaker === 'user'
                              ? 'bg-[#1D4ED8]/20 border border-[#1D4ED8]/30'
                              : 'bg-[#131B35] border border-[#1E2A52]'
                          }`}
                        >
                          <p className="text-sm text-white break-words">{snippet.snippet_text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {snippet.speaker === 'user' ? 'Voce' : lead.name} -{' '}
                            {formatDate(snippet.timestamp)}
                          </p>
                        </div>
                        {snippet.speaker === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-[#1D4ED8]/20 flex items-center justify-center shrink-0 mt-1">
                            <User className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator className="bg-[#131B35] mb-4" />

              {/* Add new snippet form */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-500">Quem falou:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSnippetSpeaker('user')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        snippetSpeaker === 'user'
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-[#131B35] text-gray-400 hover:text-white'
                      }`}
                    >
                      Voce
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetSpeaker('lead')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        snippetSpeaker === 'lead'
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-[#131B35] text-gray-400 hover:text-white'
                      }`}
                    >
                      Lead
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={snippetText}
                    onChange={(e) => setSnippetText(e.target.value)}
                    placeholder="Digite o trecho da conversa..."
                    className="bg-[#131B35] border-[#1E2A52] text-white flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddSnippet();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddSnippet}
                    disabled={sendingSnippet || !snippetText.trim()}
                    className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shrink-0"
                  >
                    {sendingSnippet ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-[#1D4ED8]" />
                Notas
                {notesSaving && (
                  <span className="text-xs text-gray-500 font-normal flex items-center gap-1 ml-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Adicione notas sobre este lead..."
                rows={5}
                className="bg-[#131B35] border-[#1E2A52] text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                As notas sao salvas automaticamente ao sair do campo.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Follow-up, Script Usage, Recommendations */}
        <div className="space-y-6">
          {/* Follow-up Scheduling */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#1D4ED8]" />
                Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Proximo follow-up
                  </label>
                  <Input
                    type="datetime-local"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="bg-[#131B35] border-[#1E2A52] text-white [color-scheme:dark]"
                  />
                </div>
                <Button
                  onClick={handleFollowupSave}
                  disabled={followupSaving}
                  className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                  size="sm"
                >
                  {followupSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarClock className="w-4 h-4 mr-2" />
                  )}
                  {followupSaving ? 'Salvando...' : 'Salvar Follow-up'}
                </Button>
                {lead.next_followup_at && (
                  <div
                    className={`text-xs flex items-center gap-1 ${
                      isOverdue ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    Agendado para {formatDate(lead.next_followup_at)}
                    {isOverdue && ' (atrasado)'}
                  </div>
                )}
                {lead.next_followup_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500 hover:text-white hover:bg-[#131B35] text-xs"
                    onClick={async () => {
                      setFollowupDate('');
                      setFollowupSaving(true);
                      try {
                        const res = await fetch(`/api/leads/${leadId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ next_followup_at: null }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setLead(data.lead);
                        }
                      } catch {
                        // ignore
                      }
                      setFollowupSaving(false);
                    }}
                  >
                    Limpar follow-up
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Script Usage History */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1D4ED8]" />
                Scripts Utilizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usagesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              ) : scriptUsages.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Nenhum script utilizado com este lead
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-3">
                    {scriptUsages.map((usage) => (
                      <div
                        key={usage.id}
                        className="bg-[#131B35] rounded-lg p-3 border border-[#1E2A52]"
                      >
                        <p className="text-sm text-white font-medium truncate">
                          {usage.scripts?.title || 'Script removido'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatDate(usage.used_at)}
                          </span>
                          {usage.effectiveness_rating && (
                            <span className="text-xs text-yellow-500">
                              {usage.effectiveness_rating}/5
                            </span>
                          )}
                          {usage.resulted_in_sale && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Venda
                            </Badge>
                          )}
                        </div>
                        {usage.feedback_note && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {usage.feedback_note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Suggested Scripts */}
          <Card className="bg-[#0A0F1E] border-[#131B35]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#1D4ED8]" />
                Scripts Sugeridos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-6">
                  <Lightbulb className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Nenhuma sugestao disponivel no momento
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-3">
                    {recommendations.map((script) => (
                      <div
                        key={script.id}
                        className={`bg-[#131B35] rounded-lg p-3 border border-[#1E2A52] transition-colors ${
                          script.is_locked
                            ? 'opacity-60'
                            : 'cursor-pointer hover:border-[#1D4ED8]/40'
                        }`}
                        onClick={() => {
                          if (!script.is_locked) {
                            router.push(`/scripts/${script.id}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-white font-medium truncate flex-1">
                            {script.title}
                          </p>
                          {script.is_locked && (
                            <Badge className="bg-gray-600/30 text-gray-400 text-xs shrink-0">
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        {script.context_description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {script.context_description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {script.global_effectiveness > 0 && (
                            <span className="text-xs text-yellow-500">
                              Eficacia: {Math.round(script.global_effectiveness * 100)}%
                            </span>
                          )}
                          {script.category && (
                            <Badge className="bg-[#0A0F1E] text-gray-400 text-xs">
                              {script.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
