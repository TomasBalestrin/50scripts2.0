'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Power,
  ChevronLeft,
  ChevronRight,
  Upload,
  Play,
  Pause,
  X,
  Volume2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import type { Script, ScriptCategory, Plan } from '@/types/database';

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-700 text-gray-300',
  pro: 'bg-blue-900/50 text-blue-400',
  premium: 'bg-purple-900/50 text-purple-400',
  copilot: 'bg-amber-900/50 text-amber-400',
};

const PAGE_SIZE = 15;

interface ScriptForm {
  title: string;
  content: string;
  content_formal: string;
  content_direct: string;
  context_description: string;
  category_id: string;
  min_plan: Plan;
  objection_keywords: string;
  tags: string;
  is_active: boolean;
}

const emptyForm: ScriptForm = {
  title: '',
  content: '',
  content_formal: '',
  content_direct: '',
  context_description: '',
  category_id: '',
  min_plan: 'starter',
  objection_keywords: '',
  tags: '',
  is_active: true,
};

export default function AdminScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScriptForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Audio state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('script_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    setCategories(data ?? []);
  }, [supabase]);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('scripts')
        .select(
          '*, category:script_categories(id, name)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, count } = await query;
      setScripts(data ?? []);
      setTotalCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setCurrentAudioUrl(null);
    setDialogOpen(true);
  }

  function openEditDialog(script: Script) {
    setEditingId(script.id);
    setForm({
      title: script.title,
      content: script.content,
      content_formal: script.content_formal || '',
      content_direct: script.content_direct || '',
      context_description: script.context_description || '',
      category_id: script.category_id,
      min_plan: script.min_plan,
      objection_keywords: (script.objection_keywords || []).join(', '),
      tags: (script.tags || []).join(', '),
      is_active: script.is_active,
    });
    setCurrentAudioUrl(script.audio_url || null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim() || !form.category_id) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        content_formal: form.content_formal.trim() || null,
        content_direct: form.content_direct.trim() || null,
        context_description: form.context_description.trim(),
        category_id: form.category_id,
        min_plan: form.min_plan,
        objection_keywords: form.objection_keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        await supabase.from('scripts').update(payload).eq('id', editingId);
      } else {
        await supabase.from('scripts').insert(payload);
      }

      setDialogOpen(false);
      await fetchScripts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from('scripts').delete().eq('id', deleteId);
      setDeleteId(null);
      await fetchScripts();
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await supabase
      .from('scripts')
      .update({
        is_active: !currentActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    await fetchScripts();
  }

  // Audio upload handler
  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;

    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('script_id', editingId);

      const res = await fetch('/api/admin/scripts/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAudioUrl(data.audio_url);
      } else {
        const err = await res.json();
        console.error('Upload error:', err.error);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingAudio(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Remove audio handler
  async function handleRemoveAudio() {
    if (!editingId) return;
    setUploadingAudio(true);
    try {
      const res = await fetch('/api/admin/scripts/upload-audio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: editingId }),
      });

      if (res.ok) {
        setCurrentAudioUrl(null);
        if (audioRef.current) {
          audioRef.current.pause();
          setAudioPlaying(false);
        }
      }
    } catch (err) {
      console.error('Remove audio failed:', err);
    } finally {
      setUploadingAudio(false);
    }
  }

  // Toggle audio playback
  function toggleAudioPlayback() {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  }

  function getCategoryName(script: Script): string {
    if (script.category && typeof script.category === 'object') {
      return (script.category as unknown as { name: string }).name;
    }
    return '-';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Scripts</h1>
        <Button
          onClick={openCreateDialog}
          className="bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Script
        </Button>
      </div>

      {/* Search */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar scripts por titulo..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="border-[#1A3050] bg-[#1A3050] pl-10 text-white placeholder:text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

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
                    <th className="px-4 py-3">Titulo</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Plano Min.</th>
                    <th className="px-4 py-3">Audio</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3 text-right">Usos</th>
                    <th className="px-4 py-3 text-right">Efetividade</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map((script) => (
                    <tr
                      key={script.id}
                      className="border-b border-[#1A3050]/50 text-white"
                    >
                      <td className="max-w-xs truncate px-4 py-3 font-medium">
                        {script.title}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {getCategoryName(script)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={PLAN_COLORS[script.min_plan] || ''}
                        >
                          {script.min_plan.charAt(0).toUpperCase() +
                            script.min_plan.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {script.audio_url ? (
                          <Volume2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            script.is_active ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {script.global_usage_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {script.global_effectiveness
                          ? `${(script.global_effectiveness * 100).toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() =>
                              handleToggleActive(script.id, script.is_active)
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => openEditDialog(script)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                            onClick={() => setDeleteId(script.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {scripts.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhum script encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#1A3050] px-4 py-3">
              <p className="text-sm text-gray-400">
                Mostrando {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#1A3050] bg-[#0F1D32] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Editar Script' : 'Novo Script'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-gray-400">Titulo</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">
                Conteudo (Casual)
              </Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={4}
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Conteudo (Formal)</Label>
              <Textarea
                value={form.content_formal}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content_formal: e.target.value,
                  }))
                }
                rows={4}
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Conteudo (Direto)</Label>
              <Textarea
                value={form.content_direct}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content_direct: e.target.value,
                  }))
                }
                rows={4}
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Descricao de Contexto</Label>
              <Textarea
                value={form.context_description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    context_description: e.target.value,
                  }))
                }
                rows={2}
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Categoria</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, category_id: val }))
                  }
                >
                  <SelectTrigger className="mt-1 border-[#1A3050] bg-[#1A3050] text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1A3050] bg-[#0F1D32] text-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-400">Plano Minimo</Label>
                <Select
                  value={form.min_plan}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      min_plan: val as Plan,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1 border-[#1A3050] bg-[#1A3050] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1A3050] bg-[#0F1D32] text-white">
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="copilot">Copilot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-400">
                Palavras-chave de Objecao (separadas por virgula)
              </Label>
              <Input
                value={form.objection_keywords}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    objection_keywords: e.target.value,
                  }))
                }
                placeholder="caro, sem dinheiro, nao preciso"
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label className="text-gray-400">
                Tags (separadas por virgula)
              </Label>
              <Input
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="vendas, whatsapp, objecao"
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white placeholder:text-gray-500"
              />
            </div>

            {/* Audio Upload Section */}
            {editingId && (
              <div>
                <Label className="text-gray-400 flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Audio do Script
                </Label>
                <div className="mt-2 space-y-3">
                  {currentAudioUrl ? (
                    <div className="flex items-center gap-3 rounded-lg border border-[#1A3050] bg-[#1A3050] p-3">
                      <audio
                        ref={audioRef}
                        src={currentAudioUrl}
                        onEnded={() => setAudioPlaying(false)}
                        onPause={() => setAudioPlaying(false)}
                        onPlay={() => setAudioPlaying(true)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleAudioPlayback}
                        className="h-10 w-10 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/30 hover:text-[#C9A84C] flex-shrink-0"
                      >
                        {audioPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">
                          {currentAudioUrl.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-500">Audio anexado</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveAudio}
                        disabled={uploadingAudio}
                        className="h-8 w-8 text-gray-400 hover:text-red-400 flex-shrink-0"
                        title="Remover audio"
                      >
                        {uploadingAudio ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Nenhum audio anexado.
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm"
                      onChange={handleAudioUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAudio}
                      className="border-[#1A3050] text-gray-300 hover:bg-[#1A3050]"
                    >
                      {uploadingAudio ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {currentAudioUrl ? 'Substituir Audio' : 'Enviar Audio'}
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-gray-600">
                      MP3, WAV, OGG, M4A, WebM (max 10MB)
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                disabled={saving || !form.title.trim() || !form.content.trim()}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="border-[#1A3050] bg-[#0F1D32] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Tem certeza que deseja excluir este script? Esta acao nao pode ser
            desfeita.
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
