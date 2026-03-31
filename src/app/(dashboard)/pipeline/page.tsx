'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Loader2,
  GripVertical,
  Phone,
  DollarSign,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Lead, LeadStage } from '@/types/database';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'novo', label: 'Novo', color: '#3B82F6' },
  { key: 'abordado', label: 'Abordado', color: '#8B5CF6' },
  { key: 'qualificado', label: 'Qualificado', color: '#F59E0B' },
  { key: 'proposta', label: 'Proposta', color: '#F97316' },
  { key: 'fechado', label: 'Fechado', color: '#10B981' },
  { key: 'perdido', label: 'Perdido', color: '#EF4444' },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null;
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000
  );
  return days;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newValue, setNewValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      if (res.status === 403) {
        setError(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone || null,
          expected_value: newValue ? parseFloat(newValue) : null,
        }),
      });
      if (res.ok) {
        const lead = await res.json();
        setLeads((prev) => [lead, ...prev]);
        setNewName('');
        setNewPhone('');
        setNewValue('');
        setShowNewLead(false);
      }
    } catch {
      // Ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDrop = async (leadId: string, newStage: LeadStage) => {
    setDragging(null);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch {
      // Revert on error
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-5xl text-center py-20">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#F59E0B]" />
          <p className="text-lg font-semibold text-white">Pipeline de Leads</p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Disponível a partir do plano Pro.
          </p>
          <Button
            className="mt-4 bg-[#1D4ED8] text-white"
            onClick={() => (window.location.href = '/upgrade')}
          >
            Fazer upgrade
          </Button>
        </div>
      </div>
    );
  }

  const leadsByStage = STAGES.map((s) => ({
    ...s,
    leads: leads.filter((l) => l.stage === s.key),
    total: leads
      .filter((l) => l.stage === s.key)
      .reduce((sum, l) => sum + (l.expected_value || 0), 0),
  }));

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-7xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-[#94A3B8]">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
            </p>
          </div>
          <Button
            onClick={() => setShowNewLead(true)}
            className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>

        {/* New lead modal */}
        {showNewLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-md border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Novo Lead
                  </h2>
                  <button
                    onClick={() => setShowNewLead(false)}
                    className="text-[#94A3B8] hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label className="text-[#94A3B8]">Nome *</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-[#020617] border-[#131B35] text-white"
                      placeholder="Nome do lead"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[#94A3B8]">Telefone</Label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="bg-[#020617] border-[#131B35] text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label className="text-[#94A3B8]">Valor esperado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="bg-[#020617] border-[#131B35] text-white"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-[#1D4ED8] text-white"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Criar Lead'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Kanban board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {leadsByStage.map((stage) => (
            <div
              key={stage.key}
              className="min-w-[280px] flex-shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-[#131B35]/30');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-[#131B35]/30');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-[#131B35]/30');
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) handleDrop(leadId, stage.key);
              }}
            >
              {/* Stage header */}
              <div className="mb-3 flex items-center justify-between rounded-lg bg-[#0A0F1E] p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-semibold text-white">
                    {stage.label}
                  </span>
                  <span className="ml-1 rounded-full bg-[#131B35] px-2 py-0.5 text-xs text-[#94A3B8]">
                    {stage.leads.length}
                  </span>
                </div>
                {stage.total > 0 && (
                  <span className="text-xs text-[#10B981]">
                    {formatCurrency(stage.total)}
                  </span>
                )}
              </div>

              {/* Lead cards */}
              <div className="space-y-2 min-h-[100px] rounded-lg border border-transparent transition-colors p-1">
                {stage.leads.map((lead) => {
                  const days = daysSince(lead.last_contact_at);
                  const isOverdue =
                    lead.next_followup_at &&
                    new Date(lead.next_followup_at) < new Date();

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', lead.id);
                        setDragging(lead.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={`cursor-grab rounded-lg border border-[#131B35] bg-[#0A0F1E] p-3 transition-all hover:border-[#1D4ED8]/30 active:cursor-grabbing ${
                        dragging === lead.id ? 'opacity-50' : ''
                      }`}
                    >
                      <Link href={`/pipeline/${lead.id}`}>
                        <p className="text-sm font-medium text-white">
                          {lead.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#94A3B8]">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                          {lead.expected_value && (
                            <span className="flex items-center gap-1 text-[#10B981]">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(lead.expected_value)}
                            </span>
                          )}
                          {days !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {days}d
                            </span>
                          )}
                        </div>
                        {isOverdue && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-[#EF4444]">
                            <AlertCircle className="h-3 w-3" /> Follow-up
                            atrasado
                          </div>
                        )}
                      </Link>
                      <GripVertical className="mt-1 h-3 w-3 text-[#64748B]" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
