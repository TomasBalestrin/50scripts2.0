'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Phone,
  DollarSign,
  Calendar,
  Save,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, LeadStage } from '@/types/database';

const STAGES: { key: LeadStage; label: string }[] = [
  { key: 'novo', label: 'Novo' },
  { key: 'abordado', label: 'Abordado' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'fechado', label: 'Fechado' },
  { key: 'perdido', label: 'Perdido' },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<LeadStage>('novo');
  const [expectedValue, setExpectedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [conversationText, setConversationText] = useState('');

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const data: Lead = await res.json();
        setLead(data);
        setName(data.name);
        setPhone(data.phone || '');
        setStage(data.stage);
        setExpectedValue(data.expected_value?.toString() || '');
        setNotes(data.notes || '');
        setNextFollowup(data.next_followup_at?.split('T')[0] || '');
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name,
        phone: phone || null,
        stage,
        expected_value: expectedValue ? parseFloat(expectedValue) : null,
        notes: notes || null,
        next_followup_at: nextFollowup ? new Date(nextFollowup).toISOString() : null,
        last_contact_at: new Date().toISOString(),
      };

      // Add conversation snippet if provided
      if (conversationText.trim()) {
        const history = lead?.conversation_history || [];
        history.push({
          timestamp: new Date().toISOString(),
          snippet_text: conversationText.trim(),
          speaker: 'user',
        });
        updates.conversation_history = history;
        setConversationText('');
      }

      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    router.push('/pipeline');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-4 text-center text-[#94A3B8]">Lead não encontrado</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-2xl space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => router.push('/pipeline')}
          className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao pipeline
        </button>

        <h1 className="text-2xl font-bold text-white">{lead.name}</h1>

        {/* Stage selector */}
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                stage === s.key
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-[#131B35] text-[#94A3B8] hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Details */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[#94A3B8] flex items-center gap-1">
                  Nome
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#020617] border-[#131B35] text-white"
                />
              </div>
              <div>
                <Label className="text-[#94A3B8] flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[#020617] border-[#131B35] text-white"
                />
              </div>
              <div>
                <Label className="text-[#94A3B8] flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Valor esperado
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(e.target.value)}
                  className="bg-[#020617] border-[#131B35] text-white"
                />
              </div>
              <div>
                <Label className="text-[#94A3B8] flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Próximo follow-up
                </Label>
                <Input
                  type="date"
                  value={nextFollowup}
                  onChange={(e) => setNextFollowup(e.target.value)}
                  className="bg-[#020617] border-[#131B35] text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-[#94A3B8]">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#020617] border-[#131B35] text-white min-h-[80px]"
                placeholder="Observações sobre o lead..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Conversation History */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquare className="h-4 w-4" /> Histórico de Conversa
            </h2>

            {lead.conversation_history && lead.conversation_history.length > 0 && (
              <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
                {lead.conversation_history.map((snippet, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[#131B35] bg-[#020617] p-3"
                  >
                    <p className="text-xs text-[#64748B]">
                      {new Date(snippet.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="mt-1 text-sm text-[#CBD5E1]">
                      {snippet.snippet_text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={conversationText}
              onChange={(e) => setConversationText(e.target.value)}
              className="bg-[#020617] border-[#131B35] text-white min-h-[80px]"
              placeholder="Cole um trecho de conversa..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
