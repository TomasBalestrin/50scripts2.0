'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Lead, LeadStage } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Kanban,
  Plus,
  Phone,
  DollarSign,
  Clock,
  AlertCircle,
  GripVertical,
} from 'lucide-react';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'novo', label: 'Novo', color: '#3B82F6' },
  { key: 'abordado', label: 'Abordado', color: '#8B5CF6' },
  { key: 'qualificado', label: 'Qualificado', color: '#F59E0B' },
  { key: 'proposta', label: 'Proposta', color: '#F97316' },
  { key: 'fechado', label: 'Fechado', color: '#10B981' },
  { key: 'perdido', label: 'Perdido', color: '#EF4444' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  const handleAddLead = async () => {
    if (!newLeadName) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeadName,
          phone: newLeadPhone || undefined,
          expected_value: newLeadValue ? parseFloat(newLeadValue) : undefined,
        }),
      });
      if (res.ok) {
        setNewLeadName('');
        setNewLeadPhone('');
        setNewLeadValue('');
        setDialogOpen(false);
        fetchLeads();
      }
    } catch {
      // ignore
    }
  };

  const handleMoveStage = useCallback(
    async (leadId: string, newStage: LeadStage) => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      );
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newStage }),
        });
        if (!res.ok) {
          // Revert on failure
          fetchLeads();
        }
      } catch {
        fetchLeads();
      }
    },
    []
  );

  const getLeadsByStage = useCallback(
    (stage: LeadStage) => leads.filter((l) => l.stage === stage),
    [leads]
  );

  const getStageValue = useCallback(
    (stage: LeadStage) =>
      leads
        .filter((l) => l.stage === stage)
        .reduce((acc, l) => acc + (l.expected_value || 0), 0),
    [leads]
  );

  const getDaysSince = (date: string | null) => {
    if (!date) return null;
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;

      // Dropped outside a droppable
      if (!destination) return;

      const newStage = destination.droppableId as LeadStage;
      const lead = leads.find((l) => l.id === draggableId);

      // No change
      if (!lead || lead.stage === newStage) return;

      handleMoveStage(draggableId, newStage);
    },
    [leads, handleMoveStage]
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map((s) => (
            <div key={s.key} className="h-96 bg-[#1A1A2E] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Kanban className="w-6 h-6 text-[#E94560]" />
          Pipeline de Leads
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E94560] hover:bg-[#d63d56] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1A1A2E] border-[#252542]">
            <DialogHeader>
              <DialogTitle className="text-white">Adicionar Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                placeholder="Nome do lead"
                className="bg-[#252542] border-[#363660] text-white"
              />
              <Input
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="bg-[#252542] border-[#363660] text-white"
              />
              <Input
                value={newLeadValue}
                onChange={(e) => setNewLeadValue(e.target.value)}
                placeholder="Valor esperado R$ (opcional)"
                type="number"
                className="bg-[#252542] border-[#363660] text-white"
              />
              <Button
                onClick={handleAddLead}
                className="w-full bg-[#E94560] hover:bg-[#d63d56] text-white"
              >
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-[#1A1A2E] border-[#252542]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-white">{leads.length}</p>
            <p className="text-xs text-gray-400">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A2E] border-[#252542]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              R$ {leads
                .filter((l) => l.stage === 'fechado')
                .reduce((acc, l) => acc + (l.expected_value || 0), 0)
                .toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-gray-400">Fechados</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A2E] border-[#252542]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">
              R$ {leads
                .filter((l) => !['fechado', 'perdido'].includes(l.stage))
                .reduce((acc, l) => acc + (l.expected_value || 0), 0)
                .toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-gray-400">Em Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board with Drag and Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.key);
            const stageValue = getStageValue(stage.key);

            return (
              <div key={stage.key} className="min-w-[200px]">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-semibold text-white truncate">
                    {stage.label}
                  </span>
                  <Badge className="bg-[#252542] text-gray-400 text-xs ml-auto shrink-0">
                    {stageLeads.length}
                  </Badge>
                </div>

                {/* Stage Value Summary */}
                {stageValue > 0 && (
                  <div className="mb-2 px-1">
                    <p className="text-xs text-gray-500">
                      R$ {stageValue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}

                {/* Droppable Column */}
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[100px] rounded-lg p-1 transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-[#252542]/60 ring-1 ring-[#E94560]/30'
                          : 'bg-transparent'
                      }`}
                    >
                      {stageLeads.map((lead, index) => {
                        const daysSince = getDaysSince(lead.last_contact_at);
                        const isOverdue =
                          lead.next_followup_at &&
                          new Date(lead.next_followup_at) < new Date();

                        return (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`transition-shadow ${
                                  dragSnapshot.isDragging ? 'shadow-xl shadow-[#E94560]/20' : ''
                                }`}
                              >
                                <Card
                                  className={`bg-[#1A1A2E] border-[#252542] hover:border-[#363660] cursor-pointer transition-colors ${
                                    dragSnapshot.isDragging
                                      ? 'border-[#E94560]/50 rotate-[2deg]'
                                      : ''
                                  }`}
                                  onClick={() => router.push(`/pipeline/${lead.id}`)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-1">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="mt-0.5 cursor-grab active:cursor-grabbing shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <GripVertical className="w-3 h-3 text-gray-600 hover:text-gray-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-white text-sm truncate">
                                          {lead.name}
                                        </p>
                                        {lead.phone && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                                            <span className="text-xs text-gray-400 truncate">
                                              {lead.phone}
                                            </span>
                                          </div>
                                        )}
                                        {lead.expected_value != null && lead.expected_value > 0 && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <DollarSign className="w-3 h-3 text-green-500 shrink-0" />
                                            <span className="text-xs text-green-400">
                                              R$ {lead.expected_value.toLocaleString('pt-BR')}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                          {daysSince !== null && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {daysSince}d
                                            </span>
                                          )}
                                          {isOverdue && (
                                            <AlertCircle className="w-3 h-3 text-red-500" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
