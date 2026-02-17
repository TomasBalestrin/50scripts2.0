'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FolderHeart, Plus, FileText, Star, Trash2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/shared/toast-container';

interface Collection {
  id: string;
  name: string;
  scripts_count: number;
  scripts: Array<{
    id: string;
    title: string;
    content: string;
    global_effectiveness: number;
  }>;
  created_at: string;
}

export default function ColecoesPage() {
  const { data: collectionsData, isLoading: loading, mutate: mutateCollections } = useSWR<{ collections: Collection[] }>('/api/collections');
  const collections = collectionsData?.collections || [];

  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const { toasts, toast, toastWithUndo, dismiss } = useToast();
  const deleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName('');
        setDialogOpen(false);
        mutateCollections();
        toast('Coleção criada com sucesso', 'success');
      } else {
        toast('Erro ao criar coleção', 'error');
      }
    } catch {
      toast('Erro ao criar coleção', 'error');
    }
  };

  const handleRemoveScript = async (collectionId: string, scriptId: string) => {
    // Save current data for undo
    const previousData = collectionsData;

    // Optimistic removal
    const optimistic = {
      collections: collections.map((c) =>
        c.id === collectionId
          ? { ...c, scripts: c.scripts.filter((s) => s.id !== scriptId), scripts_count: c.scripts_count - 1 }
          : c
      ),
    };
    mutateCollections(optimistic, false);

    // Schedule actual deletion after 5 seconds
    const timerKey = `${collectionId}-${scriptId}`;
    const deleteTimer = setTimeout(async () => {
      deleteTimersRef.current.delete(timerKey);
      try {
        await fetch(`/api/collections/${collectionId}/scripts`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script_id: scriptId }),
        });
        mutateCollections();
      } catch {
        mutateCollections();
      }
    }, 5000);
    deleteTimersRef.current.set(timerKey, deleteTimer);

    // Show undo toast
    toastWithUndo('Script removido da coleção', () => {
      const timer = deleteTimersRef.current.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        deleteTimersRef.current.delete(timerKey);
      }
      mutateCollections(previousData, false);
    });
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // Register usage (fire-and-forget)
    fetch(`/api/scripts/${id}/use`, { method: 'POST' }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[#0A0F1E] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderHeart className="w-6 h-6 text-[#1D4ED8]" />
          Minhas Coleções
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nova Coleção
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0F1E] border-[#131B35]">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Coleção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Ex: "Melhores para Saúde"'
                className="bg-[#131B35] border-[#1E2A52] text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
              >
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16">
          <FolderHeart className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">Nenhuma coleção criada</p>
          <p className="text-sm text-gray-500">
            Organize seus scripts favoritos em coleções personalizadas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="bg-[#0A0F1E] border-[#131B35]">
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === collection.id ? null : collection.id)
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <FolderHeart className="w-4 h-4 text-[#1D4ED8]" />
                    {collection.name}
                  </CardTitle>
                  <Badge className="bg-[#131B35] text-gray-400">
                    {collection.scripts_count} scripts
                  </Badge>
                </div>
              </CardHeader>

              {expandedId === collection.id && (
                <CardContent className="pt-0">
                  {collection.scripts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum script nesta coleção. Adicione scripts pela tela de detalhe.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {collection.scripts.map((script) => (
                        <div
                          key={script.id}
                          className="flex items-center gap-3 p-3 bg-[#131B35] rounded-lg"
                        >
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => router.push(`/scripts/${script.id}`)}
                          >
                            <p className="text-sm text-white truncate">{script.title}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-400">
                                {script.global_effectiveness.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopy(script.content, script.id)}
                            className="p-1.5 rounded hover:bg-[#1E2A52] transition-colors"
                          >
                            {copiedId === script.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveScript(collection.id, script.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
