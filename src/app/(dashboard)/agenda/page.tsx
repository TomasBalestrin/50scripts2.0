'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Sun, Clock, Sunset, Moon, Copy, Check } from 'lucide-react';

interface AgendaBlock {
  block: string;
  label: string;
  action: string;
  category: string;
  item: {
    id: string;
    completed: boolean;
    suggested_script: {
      id: string;
      title: string;
      content: string;
      context_description: string;
    } | null;
  } | null;
}

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  morning: <Sun className="w-5 h-5 text-yellow-500" />,
  midday: <Clock className="w-5 h-5 text-orange-500" />,
  afternoon: <Sunset className="w-5 h-5 text-purple-500" />,
  evening: <Moon className="w-5 h-5 text-blue-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  approach: 'Abordar novos leads',
  followup: 'Qualificar contatos',
  proposal: 'Follow-ups pendentes',
  close: 'Fechar negócios',
};

export default function AgendaPage() {
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agenda/today');
        const data = await res.json();
        setBlocks(data.blocks || []);
        setDate(data.date || '');
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleComplete = async (itemId: string, completed: boolean) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.item?.id === itemId
          ? { ...b, item: { ...b.item!, completed } }
          : b
      )
    );
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-[#0F1D32] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const completedCount = blocks.filter((b) => b.item?.completed).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#C9A84C]" />
            Agenda de Vendas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <Badge className="bg-[#1A3050] text-white">
          {completedCount}/{blocks.length} concluídos
        </Badge>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <Card
            key={block.block}
            className={`bg-[#0F1D32] border-[#1A3050] transition-all ${
              block.item?.completed ? 'opacity-60' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {BLOCK_ICONS[block.block]}
                  <div>
                    <CardTitle className="text-white text-base">{block.label}</CardTitle>
                    <p className="text-sm text-gray-400">{ACTION_LABELS[block.action]}</p>
                  </div>
                </div>
                <Checkbox
                  checked={block.item?.completed || false}
                  onCheckedChange={(checked) =>
                    block.item && handleComplete(block.item.id, checked as boolean)
                  }
                  className="border-[#1A3050] data-[state=checked]:bg-[#C9A84C]"
                />
              </div>
            </CardHeader>

            {block.item?.suggested_script && (
              <CardContent>
                <div className="bg-[#1A3050] rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-1">
                    {block.item.suggested_script.title}
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {block.item.suggested_script.content}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#363660] text-gray-300 hover:bg-[#363660] text-xs"
                      onClick={() => router.push(`/scripts/${block.item!.suggested_script!.id}`)}
                    >
                      Ver Script
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#C9A84C] hover:bg-[#d63d56] text-white text-xs"
                      onClick={() =>
                        handleCopy(
                          block.item!.suggested_script!.content,
                          block.item!.suggested_script!.id
                        )
                      }
                    >
                      {copiedId === block.item.suggested_script.id ? (
                        <>
                          <Check className="w-3 h-3 mr-1" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
