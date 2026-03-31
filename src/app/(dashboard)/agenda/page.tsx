'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Calendar,
  Check,
  Clock,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AgendaItem {
  id: string;
  time_block: string;
  action_type: string;
  completed: boolean;
  lead_id: string | null;
  suggested_script_id: string | null;
  lead?: { name: string } | null;
  script?: { title: string } | null;
}

const BLOCK_INFO: Record<string, { label: string; time: string; icon: string; color: string }> = {
  morning: { label: 'Manhã', time: '8h - 12h', icon: '🌅', color: '#F59E0B' },
  midday: { label: 'Meio-dia', time: '12h - 14h', icon: '☀️', color: '#F97316' },
  afternoon: { label: 'Tarde', time: '14h - 18h', icon: '🌤️', color: '#3B82F6' },
  evening: { label: 'Noite', time: '18h - 21h', icon: '🌙', color: '#8B5CF6' },
};

const ACTION_LABELS: Record<string, string> = {
  approach: 'Abordagem',
  followup: 'Follow-up',
  proposal: 'Proposta',
  close: 'Fechamento',
};

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [date, setDate] = useState('');

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda');
      if (res.status === 403) {
        setError(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAgenda(data.agenda || []);
        setDate(data.date || '');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const handleComplete = async (itemId: string) => {
    // Optimistic update
    setAgenda((prev) =>
      prev.map((a) => (a.id === itemId ? { ...a, completed: true } : a))
    );

    // Note: sales_agenda doesn't have its own API for update; we'd need one
    // For now, just update locally
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
        <div className="mx-auto max-w-2xl text-center py-20">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#F59E0B]" />
          <p className="text-lg font-semibold text-white">Agenda de Vendas</p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Disponível a partir do plano Plus.
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

  const completed = agenda.filter((a) => a.completed).length;
  const total = agenda.length;

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-2xl space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Calendar className="h-6 w-6 text-[#1D4ED8]" /> Agenda de Vendas
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            {date &&
              new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
          </p>
        </div>

        {/* Progress */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#94A3B8]">Progresso do dia</span>
              <span className="text-sm font-semibold text-white">
                {completed}/{total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#131B35]">
              <div
                className="h-2 rounded-full bg-[#1D4ED8] transition-all"
                style={{
                  width: `${total > 0 ? (completed / total) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agenda items */}
        <div className="space-y-3">
          {agenda.map((item) => {
            const block = BLOCK_INFO[item.time_block] || BLOCK_INFO.morning;
            return (
              <Card
                key={item.id}
                className={`border-[#131B35] bg-[#0A0F1E] ${
                  item.completed ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Complete button */}
                  <button
                    onClick={() => handleComplete(item.id)}
                    disabled={item.completed}
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                      item.completed
                        ? 'border-[#10B981] bg-[#10B981]/20'
                        : 'border-[#131B35] hover:border-[#1D4ED8]'
                    }`}
                  >
                    {item.completed && (
                      <Check className="h-3.5 w-3.5 text-[#10B981]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{block.icon}</span>
                      <span className="text-sm font-semibold text-white">
                        {block.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#64748B]">
                        <Clock className="h-3 w-3" /> {block.time}
                      </span>
                    </div>

                    <p
                      className="text-sm font-medium"
                      style={{ color: block.color }}
                    >
                      {ACTION_LABELS[item.action_type] || item.action_type}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.lead && (
                        <Link
                          href={`/pipeline/${item.lead_id}`}
                          className="flex items-center gap-1 rounded-full bg-[#131B35] px-2.5 py-1 text-xs text-[#CBD5E1] hover:bg-[#1D4ED8]/20"
                        >
                          <User className="h-3 w-3" /> {item.lead.name}
                        </Link>
                      )}
                      {item.script && (
                        <Link
                          href={`/scripts/${item.suggested_script_id}`}
                          className="flex items-center gap-1 rounded-full bg-[#131B35] px-2.5 py-1 text-xs text-[#CBD5E1] hover:bg-[#1D4ED8]/20"
                        >
                          <FileText className="h-3 w-3" /> {item.script.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {agenda.length === 0 && (
          <div className="py-10 text-center text-[#94A3B8]">
            Nenhuma agenda disponível para hoje.
          </div>
        )}
      </motion.div>
    </div>
  );
}
