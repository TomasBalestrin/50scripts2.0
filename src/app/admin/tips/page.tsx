'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Power,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { MicrolearningTip } from '@/types/database';

const TIP_CATEGORIES = [
  { value: 'abordagem', label: 'Abordagem' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'objecao', label: 'Objeção' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'geral', label: 'Geral' },
];

const CATEGORY_COLORS: Record<string, string> = {
  abordagem: 'bg-blue-900/50 text-blue-400',
  qualificacao: 'bg-green-900/50 text-green-400',
  fechamento: 'bg-purple-900/50 text-purple-400',
  objecao: 'bg-amber-900/50 text-amber-400',
  followup: 'bg-cyan-900/50 text-cyan-400',
  geral: 'bg-gray-700 text-gray-300',
};

interface TipForm {
  content: string;
  category: string;
  is_active: boolean;
}

const emptyForm: TipForm = {
  content: '',
  category: 'geral',
  is_active: true,
};

export default function AdminTipsPage() {
  const [tips, setTips] = useState<MicrolearningTip[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TipForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('microlearning_tips')
        .select('*')
        .order('created_at', { ascending: false });
      setTips(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(tip: MicrolearningTip) {
    setEditingId(tip.id);
    setForm({
      content: tip.content,
      category: tip.category || 'geral',
      is_active: tip.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        content: form.content.trim(),
        category: form.category,
        is_active: form.is_active,
      };

      if (editingId) {
        await supabase
          .from('microlearning_tips')
          .update(payload)
          .eq('id', editingId);
      } else {
        await supabase.from('microlearning_tips').insert(payload);
      }

      setDialogOpen(false);
      await fetchTips();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from('microlearning_tips').delete().eq('id', deleteId);
      setDeleteId(null);
      await fetchTips();
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await supabase
      .from('microlearning_tips')
      .update({ is_active: !currentActive })
      .eq('id', id);
    await fetchTips();
  }

  function getCategoryLabel(cat: string | null): string {
    const found = TIP_CATEGORIES.find((c) => c.value === cat);
    return found?.label || 'Geral';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dicas</h1>
        <Button
          onClick={openCreateDialog}
          className="bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Dica
        </Button>
      </div>

      {/* Table */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A3050] text-left text-gray-400">
                    <th className="px-4 py-3">Conteúdo</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tips.map((tip) => (
                    <tr
                      key={tip.id}
                      className="border-b border-[#1A3050]/50 text-white"
                    >
                      <td className="max-w-md truncate px-4 py-3">
                        {tip.content}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            CATEGORY_COLORS[tip.category || 'geral'] || ''
                          }
                        >
                          {getCategoryLabel(tip.category)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            tip.is_active ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() =>
                              handleToggleActive(tip.id, tip.is_active)
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => openEditDialog(tip)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                            onClick={() => setDeleteId(tip.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tips.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhuma dica cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#1A3050] bg-[#0F1D32] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Editar Dica' : 'Nova Dica'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-gray-400">Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={4}
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
                placeholder="Digite a dica de microlearning..."
              />
            </div>

            <div>
              <Label className="text-gray-400">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, category: val }))
                }
              >
                <SelectTrigger className="mt-1 border-[#1A3050] bg-[#1A3050] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#1A3050] bg-[#0F1D32] text-white">
                  {TIP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_active: checked }))
                }
              />
              <Label className="text-gray-400">Ativo</Label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-[#1A3050] text-gray-300 hover:bg-[#1A3050]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.content.trim()}
                className="bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="border-[#1A3050] bg-[#0F1D32] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Tem certeza que deseja excluir esta dica?
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-[#1A3050] text-gray-300 hover:bg-[#1A3050]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
