'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { ScriptCategory } from '@/types/database';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
}

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  color: '#1D4ED8',
  display_order: 0,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<
    (ScriptCategory & { scripts_count?: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('script_categories')
        .select('*')
        .order('display_order', { ascending: true });

      // Get script counts for each category
      const categoriesWithCount = await Promise.all(
        (data ?? []).map(async (cat: Record<string, unknown>) => {
          const { count } = await supabase
            .from('scripts')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id);
          return { ...cat, scripts_count: count ?? 0 };
        })
      );

      setCategories(categoriesWithCount);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreateDialog() {
    setEditingId(null);
    const maxOrder = categories.reduce(
      (max, c) => Math.max(max, c.display_order),
      0
    );
    setForm({ ...emptyForm, display_order: maxOrder + 1 });
    setDialogOpen(true);
  }

  function openEditDialog(cat: ScriptCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '',
      color: cat.color || '#1D4ED8',
      display_order: cat.display_order,
    });
    setDialogOpen(true);
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug.trim() || generateSlug(form.name);
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        icon: form.icon.trim(),
        color: form.color.trim(),
        display_order: form.display_order,
        is_active: true,
      };

      if (editingId) {
        await supabase
          .from('script_categories')
          .update(payload)
          .eq('id', editingId);
      } else {
        await supabase.from('script_categories').insert(payload);
      }

      setDialogOpen(false);
      await fetchCategories();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from('script_categories').delete().eq('id', deleteId);
      setDeleteId(null);
      await fetchCategories();
    } finally {
      setDeleting(false);
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const currentOrder = categories[idx].display_order;
    const swapOrder = categories[swapIdx].display_order;

    await Promise.all([
      supabase
        .from('script_categories')
        .update({ display_order: swapOrder })
        .eq('id', categories[idx].id),
      supabase
        .from('script_categories')
        .update({ display_order: currentOrder })
        .eq('id', categories[swapIdx].id),
    ]);

    await fetchCategories();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Categorias</h1>
        <Button
          onClick={openCreateDialog}
          className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Categoria
        </Button>
      </div>

      {/* Table */}
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
                    <th className="px-4 py-3">Ordem</th>
                    <th className="px-4 py-3">Emoji</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3 text-right">Scripts</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className="border-b border-[#131B35]/50 text-white"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {cat.display_order}
                      </td>
                      <td className="px-4 py-3 text-xl">{cat.icon || '-'}</td>
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {cat.slug}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-gray-300">
                        {cat.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cat.scripts_count ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            disabled={idx === 0}
                            onClick={() => handleReorder(cat.id, 'up')}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleReorder(cat.id, 'down')}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => openEditDialog(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                            onClick={() => setDeleteId(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhuma categoria cadastrada.
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
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-gray-400">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editingId ? f.slug : generateSlug(name),
                  }));
                }}
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] font-mono text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Emoji / Ícone</Label>
                <Input
                  value={form.icon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, icon: e.target.value }))
                  }
                  placeholder="Ex: 👋"
                  className="mt-1 border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-400">Cor</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="h-10 w-10 cursor-pointer rounded border-none bg-transparent"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="border-[#131B35] bg-[#131B35] font-mono text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-400">Ordem de Exibição</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    display_order: parseInt(e.target.value) || 0,
                  }))
                }
                className="mt-1 w-24 border-[#131B35] bg-[#131B35] text-white"
              />
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
                disabled={saving || !form.name.trim()}
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

      {/* Delete Confirmation Dialog */}
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
            Tem certeza que deseja excluir esta categoria? Scripts associados
            ficarão sem categoria.
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
