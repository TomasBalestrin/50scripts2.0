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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { Mission } from '@/types/database';

interface MissionForm {
  title: string;
  description: string;
  is_active: boolean;
}

const emptyForm: MissionForm = {
  title: '',
  description: '',
  is_active: true,
};

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MissionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false });
      setMissions(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(mission: Mission) {
    setEditingId(mission.id);
    setForm({
      title: mission.title,
      description: mission.description,
      is_active: mission.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
      };

      if (editingId) {
        await supabase
          .from('missions')
          .update(payload)
          .eq('id', editingId);
      } else {
        await supabase.from('missions').insert(payload);
      }

      setDialogOpen(false);
      await fetchMissions();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from('missions').delete().eq('id', deleteId);
      setDeleteId(null);
      await fetchMissions();
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await supabase
      .from('missions')
      .update({ is_active: !currentActive })
      .eq('id', id);
    await fetchMissions();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Missões Diárias</h1>
        <Button
          onClick={openCreateDialog}
          className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Missão
        </Button>
      </div>

      <p className="text-sm text-[#94A3B8]">
        Crie missões que serão atribuídas diariamente aos usuários (2 por dia, sorteadas aleatoriamente). Cada missão concluída dá 20 XP.
      </p>

      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map((mission) => (
                    <tr
                      key={mission.id}
                      className="border-b border-[#131B35]/50 text-white"
                    >
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                        {mission.title}
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-[#94A3B8]">
                        {mission.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            mission.is_active ? 'bg-green-500' : 'bg-red-500'
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
                              handleToggleActive(mission.id, mission.is_active)
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => openEditDialog(mission)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                            onClick={() => setDeleteId(mission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {missions.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhuma missão cadastrada.
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
        <DialogContent className="border-[#131B35] bg-[#0A0F1E] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Editar Missão' : 'Nova Missão'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-gray-400">Título</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
                placeholder="Ex: Use 3 scripts hoje"
              />
            </div>

            <div>
              <Label className="text-gray-400">Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
                placeholder="Detalhes sobre a missão..."
              />
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
                className="border-[#131B35] text-gray-300 hover:bg-[#131B35]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
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
        <DialogContent className="border-[#131B35] bg-[#0A0F1E] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Tem certeza que deseja excluir esta missão?
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-[#131B35] text-gray-300 hover:bg-[#131B35]"
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
