'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Play,
  X,
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
import { MonacoEditor } from '@/components/admin/monaco-editor';
import type { AIPrompt, AIPromptType } from '@/types/database';

const PROMPT_TYPE_LABELS: Record<AIPromptType, string> = {
  generation: 'Geracao',
  conversation: 'Conversa',
  analysis: 'Analise',
  objection: 'Objecao',
};

const PROMPT_TYPE_COLORS: Record<AIPromptType, string> = {
  generation: 'bg-blue-900/50 text-blue-400',
  conversation: 'bg-green-900/50 text-green-400',
  analysis: 'bg-purple-900/50 text-purple-400',
  objection: 'bg-amber-900/50 text-amber-400',
};

interface PromptForm {
  name: string;
  type: AIPromptType;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

const emptyForm: PromptForm = {
  name: '',
  type: 'generation',
  system_prompt: '',
  user_prompt_template: '',
  model: 'claude-sonnet-4-5',
  temperature: 0.7,
  max_tokens: 2048,
  is_active: true,
};

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromptForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Test playground
  const [testOpen, setTestOpen] = useState(false);
  const [testPrompt, setTestPrompt] = useState<AIPrompt | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');

  const supabase = createClient();

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      setPrompts(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(prompt: AIPrompt) {
    setEditingId(prompt.id);
    setForm({
      name: prompt.name,
      type: prompt.type,
      system_prompt: prompt.system_prompt,
      user_prompt_template: prompt.user_prompt_template,
      model: prompt.model,
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
      is_active: prompt.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.system_prompt.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        // Get current version
        const existing = prompts.find((p) => p.id === editingId);
        const newVersion = (existing?.version ?? 0) + 1;

        await supabase
          .from('ai_prompts')
          .update({
            name: form.name.trim(),
            type: form.type,
            system_prompt: form.system_prompt.trim(),
            user_prompt_template: form.user_prompt_template.trim(),
            model: form.model.trim(),
            temperature: form.temperature,
            max_tokens: form.max_tokens,
            is_active: form.is_active,
            version: newVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
      } else {
        await supabase.from('ai_prompts').insert({
          name: form.name.trim(),
          type: form.type,
          system_prompt: form.system_prompt.trim(),
          user_prompt_template: form.user_prompt_template.trim(),
          model: form.model.trim(),
          temperature: form.temperature,
          max_tokens: form.max_tokens,
          is_active: form.is_active,
          version: 1,
        });
      }

      setDialogOpen(false);
      await fetchPrompts();
    } finally {
      setSaving(false);
    }
  }

  function handleTest(prompt: AIPrompt) {
    setTestPrompt(prompt);
    setTestInput('');
    setTestResult('');
    setTestOpen(true);
  }

  function runTest() {
    if (!testPrompt || !testInput.trim()) return;
    // Mock test - shows what would be sent
    const result = `--- System Prompt ---\n${testPrompt.system_prompt}\n\n--- User Prompt (template preenchido) ---\n${testPrompt.user_prompt_template.replace(/\{\{input\}\}/g, testInput).replace(/\{\{context\}\}/g, testInput)}\n\n--- Configuracoes ---\nModel: ${testPrompt.model}\nTemperature: ${testPrompt.temperature}\nMax Tokens: ${testPrompt.max_tokens}\n\n[Simulacao - Em producao, o prompt seria enviado a API da IA]`;
    setTestResult(result);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Prompts IA</h1>
        <Button
          onClick={openCreateDialog}
          className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Prompt
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
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Temperatura</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Versao</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map((prompt) => (
                    <tr
                      key={prompt.id}
                      className="border-b border-[#131B35]/50 text-white"
                    >
                      <td className="px-4 py-3 font-medium">{prompt.name}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={PROMPT_TYPE_COLORS[prompt.type] || ''}
                        >
                          {PROMPT_TYPE_LABELS[prompt.type] || prompt.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {prompt.model}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {prompt.temperature}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            prompt.is_active ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        v{prompt.version}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-green-400"
                            onClick={() => handleTest(prompt)}
                            title="Testar"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={() => openEditDialog(prompt)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {prompts.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhum prompt cadastrado.
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-[#131B35] bg-[#0A0F1E] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Editar Prompt' : 'Novo Prompt'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 border-[#131B35] bg-[#131B35] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-400">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      type: val as AIPromptType,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1 border-[#131B35] bg-[#131B35] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                    <SelectItem value="generation">Geracao</SelectItem>
                    <SelectItem value="conversation">Conversa</SelectItem>
                    <SelectItem value="analysis">Analise</SelectItem>
                    <SelectItem value="objection">Objecao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 mb-1 block">System Prompt</Label>
              <MonacoEditor
                value={form.system_prompt}
                onChange={(val) =>
                  setForm((f) => ({ ...f, system_prompt: val }))
                }
                language="markdown"
                height="250px"
                placeholder="Insira o system prompt aqui..."
              />
            </div>

            <div>
              <Label className="text-gray-400 mb-1 block">User Prompt Template</Label>
              <MonacoEditor
                value={form.user_prompt_template}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    user_prompt_template: val,
                  }))
                }
                language="markdown"
                height="200px"
                placeholder="Use {{input}} e {{context}} como variaveis"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-400">Modelo</Label>
                <Input
                  value={form.model}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, model: e.target.value }))
                  }
                  className="mt-1 border-[#131B35] bg-[#131B35] font-mono text-sm text-white"
                />
              </div>
              <div>
                <Label className="text-gray-400">Temperatura (0-1)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={0}
                  max={1}
                  value={form.temperature}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      temperature: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="mt-1 border-[#131B35] bg-[#131B35] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-400">Max Tokens</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.max_tokens}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_tokens: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="mt-1 border-[#131B35] bg-[#131B35] text-white"
                />
              </div>
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
                disabled={
                  saving || !form.name.trim() || !form.system_prompt.trim()
                }
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

      {/* Test Playground Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#131B35] bg-[#0A0F1E] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Testar Prompt: {testPrompt?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-gray-400">Input de Teste</Label>
              <Textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={4}
                placeholder="Digite o texto de entrada para testar o prompt..."
                className="mt-1 border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              onClick={runTest}
              disabled={!testInput.trim()}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Executar Teste
            </Button>

            {testResult && (
              <div>
                <Label className="text-gray-400">Resultado</Label>
                <pre className="mt-1 max-h-80 overflow-auto rounded-lg border border-[#131B35] bg-[#020617] p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
