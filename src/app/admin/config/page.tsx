'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Bot,
  Key,
  ToggleLeft,
  Gift,
  CheckCircle,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CircleDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface AppConfig {
  webhook_secret: string;
  ai_credits: {
    starter: number;
    pro: number;
    premium: number;
    copilot: number;
  };
  default_password: string;
  feature_flags: {
    enable_semantic_search: boolean;
    enable_audio: boolean;
    enable_export: boolean;
    enable_smart_agenda: boolean;
  };
  referral_rewards: {
    '1': { type: string; value: number };
    '3': { type: string; value: number };
    '10': { type: string; value: number };
  };
}

interface WebhookEndpoint {
  name: string;
  path: string;
  auth: string;
  description: string;
  events: string[];
  configured: boolean;
}

interface ProductMapping {
  label: string;
  envVar: string;
  configured: boolean;
}

interface WebhookStatus {
  baseUrl: string | null;
  envStatus: Record<string, boolean>;
  webhookEndpoints: WebhookEndpoint[];
  productMapping: Record<string, ProductMapping>;
}

const defaultConfig: AppConfig = {
  webhook_secret: '',
  ai_credits: {
    starter: 0,
    pro: 0,
    premium: 15,
    copilot: -1,
  },
  default_password: '(gerada automaticamente)',
  feature_flags: {
    enable_semantic_search: false,
    enable_audio: false,
    enable_export: false,
    enable_smart_agenda: false,
  },
  referral_rewards: {
    '1': { type: 'ai_credits', value: 3 },
    '3': { type: 'free_pro_month', value: 1 },
    '10': { type: 'free_premium_month', value: 1 },
  },
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const supabase = createClient();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
          'webhook_secret',
          'ai_credits',
          'default_password',
          'feature_flags',
          'referral_rewards',
        ]);

      if (data && data.length > 0) {
        const configMap: Record<string, unknown> = {};
        for (const row of data) {
          configMap[row.key] = row.value;
        }

        setConfig({
          webhook_secret:
            typeof configMap.webhook_secret === 'string'
              ? configMap.webhook_secret
              : (configMap.webhook_secret as Record<string, string>)?.value ?? defaultConfig.webhook_secret,
          ai_credits:
            (configMap.ai_credits as AppConfig['ai_credits']) ??
            defaultConfig.ai_credits,
          default_password:
            typeof configMap.default_password === 'string'
              ? configMap.default_password
              : (configMap.default_password as Record<string, string>)?.value ?? defaultConfig.default_password,
          feature_flags:
            (configMap.feature_flags as AppConfig['feature_flags']) ??
            defaultConfig.feature_flags,
          referral_rewards:
            (configMap.referral_rewards as AppConfig['referral_rewards']) ??
            defaultConfig.referral_rewards,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchWebhookStatus = useCallback(async () => {
    setWebhookStatusLoading(true);
    try {
      const res = await fetch('/api/admin/webhook-status');
      if (res.ok) {
        const data = await res.json();
        setWebhookStatus(data);
      }
    } catch (err) {
      console.error('Erro ao carregar status dos webhooks:', err);
    } finally {
      setWebhookStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchWebhookStatus();
  }, [fetchConfig, fetchWebhookStatus]);

  async function handleSave() {
    setSaving(true);
    try {
      const entries = [
        {
          key: 'webhook_secret',
          value: { value: config.webhook_secret },
        },
        { key: 'ai_credits', value: config.ai_credits },
        {
          key: 'default_password',
          value: { value: config.default_password },
        },
        { key: 'feature_flags', value: config.feature_flags },
        { key: 'referral_rewards', value: config.referral_rewards },
      ];

      for (const entry of entries) {
        await supabase
          .from('app_config')
          .upsert(
            {
              key: entry.key,
              value: entry.value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );
      }

      setToast('Configurações salvas com sucesso!');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setToast('Erro ao salvar configurações.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  const baseUrl = webhookStatus?.baseUrl || 'https://SEU-DOMINIO.vercel.app';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-20 z-50 flex items-center gap-2 rounded-lg border border-green-800 bg-green-900/90 px-4 py-3 text-sm text-green-300 shadow-lg">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* ============================================ */}
      {/* WEBHOOK INTEGRATION SECTION */}
      {/* ============================================ */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Webhook className="h-5 w-5 text-[#1D4ED8]" />
            Integração de Webhooks
          </CardTitle>
          <p className="text-xs text-gray-500">
            Configure os webhooks na sua plataforma de pagamento para liberar acesso automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {webhookStatusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#1D4ED8]" />
            </div>
          ) : (
            <>
              {/* Status das Variáveis de Ambiente */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Status das Variáveis de Ambiente
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {webhookStatus && Object.entries(webhookStatus.envStatus).map(([key, configured]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-[#131B35] bg-[#131B35]/50 px-3 py-2"
                    >
                      <CircleDot
                        className={`h-3 w-3 ${configured ? 'text-green-400' : 'text-red-400'}`}
                      />
                      <code className="text-xs text-gray-300">{key}</code>
                      <Badge
                        className={`ml-auto text-[10px] ${
                          configured
                            ? 'border-green-800 bg-green-900/30 text-green-400'
                            : 'border-red-800 bg-red-900/30 text-red-400'
                        }`}
                      >
                        {configured ? 'OK' : 'Faltando'}
                      </Badge>
                    </div>
                  ))}
                </div>
                {webhookStatus && Object.values(webhookStatus.envStatus).some(v => !v) && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-800/50 bg-amber-900/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-xs text-amber-300">
                      Configure as variáveis faltantes no painel do Vercel em{' '}
                      <span className="font-medium">Settings &gt; Environment Variables</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Mapeamento de Produtos Hotmart */}
              {webhookStatus?.productMapping && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-gray-300">
                    Mapeamento de Produtos Hotmart
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(webhookStatus.productMapping).map(([, mapping]) => (
                      <div
                        key={mapping.envVar}
                        className="flex items-center justify-between rounded-lg border border-[#131B35] bg-[#131B35]/50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{mapping.label}</p>
                          <code className="text-xs text-gray-500">{mapping.envVar}</code>
                        </div>
                        <Badge
                          className={`text-[10px] ${
                            mapping.configured
                              ? 'border-green-800 bg-green-900/30 text-green-400'
                              : 'border-red-800 bg-red-900/30 text-red-400'
                          }`}
                        >
                          {mapping.configured ? 'Configurado' : 'Faltando'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URLs dos Webhooks */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  URLs dos Webhooks
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                  Copie a URL abaixo e configure na plataforma de pagamento. Para a Hotmart, vá em{' '}
                  <span className="font-medium text-gray-400">Produto &gt; Configurações &gt; Webhooks</span>.
                </p>
                <div className="space-y-3">
                  {webhookStatus?.webhookEndpoints.map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className="rounded-lg border border-[#131B35] bg-[#020617] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{endpoint.name}</p>
                            <Badge
                              className={`text-[10px] ${
                                endpoint.configured
                                  ? 'border-green-800 bg-green-900/30 text-green-400'
                                  : 'border-amber-800 bg-amber-900/30 text-amber-400'
                              }`}
                            >
                              {endpoint.configured ? 'Pronto' : 'Falta config'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{endpoint.description}</p>
                        </div>
                      </div>

                      {/* URL com botão de copiar */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 overflow-hidden rounded-md border border-[#131B35] bg-[#0A0F1E] px-3 py-2">
                          <code className="block truncate text-xs text-[#3B82F6]">
                            {baseUrl}{endpoint.path}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard(`${baseUrl}${endpoint.path}`, endpoint.path)}
                        >
                          {copiedField === endpoint.path ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Autenticação */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] uppercase text-gray-600">Header:</span>
                        <code className="text-xs text-gray-400">{endpoint.auth}</code>
                      </div>

                      {/* Eventos */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {endpoint.events.map((event) => (
                          <Badge
                            key={event}
                            className="border-[#131B35] bg-[#131B35] text-[10px] text-gray-400"
                          >
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passo a passo Hotmart */}
              <div className="rounded-lg border border-[#1D4ED8]/30 bg-[#1D4ED8]/5 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#3B82F6]">
                  <ExternalLink className="h-4 w-4" />
                  Como configurar na Hotmart
                </h3>
                <ol className="space-y-2 text-xs text-gray-400">
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">1.</span>
                    <span>
                      Acesse o painel da Hotmart e vá em{' '}
                      <span className="text-gray-300">Ferramentas &gt; Webhooks (API de Notificações)</span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">2.</span>
                    <span>
                      Clique em <span className="text-gray-300">Configurações</span> e adicione a URL do webhook Hotmart acima
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">3.</span>
                    <span>
                      No campo <span className="text-gray-300">Hottok</span>, defina um token seguro (o mesmo que você configurou na env var{' '}
                      <code className="text-[#3B82F6]">HOTMART_HOTTOK</code> no Vercel)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">4.</span>
                    <span>
                      Selecione os eventos:{' '}
                      <span className="text-gray-300">
                        PURCHASE_COMPLETE, PURCHASE_CANCELED, PURCHASE_REFUNDED, SUBSCRIPTION_CANCELLATION
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">5.</span>
                    <span>
                      Configure as env vars <code className="text-[#3B82F6]">HOTMART_PRODUCT_PRO</code>,{' '}
                      <code className="text-[#3B82F6]">HOTMART_PRODUCT_PREMIUM</code> e{' '}
                      <code className="text-[#3B82F6]">HOTMART_PRODUCT_COPILOT</code> com os IDs dos respectivos produtos na Hotmart
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-[#3B82F6]">6.</span>
                    <span>
                      Faça uma compra de teste para validar que o webhook está funcionando. Acompanhe em{' '}
                      <span className="text-gray-300">Admin &gt; Webhooks</span>
                    </span>
                  </li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* WEBHOOK SECRET */}
      {/* ============================================ */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Shield className="h-5 w-5 text-[#1D4ED8]" />
            Webhook Secret
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showWebhookSecret ? 'text' : 'password'}
                value={config.webhook_secret}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    webhook_secret: e.target.value,
                  }))
                }
                placeholder="whsec_..."
                className="border-[#131B35] bg-[#131B35] pr-10 text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Usado para validar webhooks internos (access-grant, plan-upgrade, plan-cancel).
          </p>
        </CardContent>
      </Card>

      {/* AI Credits per Plan */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="h-5 w-5 text-[#1D4ED8]" />
            Créditos IA por Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label className="text-gray-400">Starter</Label>
              <Input
                type="number"
                value={config.ai_credits.starter}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ai_credits: {
                      ...c.ai_credits,
                      starter: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Plus</Label>
              <Input
                type="number"
                value={config.ai_credits.pro}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ai_credits: {
                      ...c.ai_credits,
                      pro: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Pro</Label>
              <Input
                type="number"
                value={config.ai_credits.premium}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ai_credits: {
                      ...c.ai_credits,
                      premium: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">
                Premium{' '}
                <span className="text-xs text-gray-600">(-1 = ilimitado)</span>
              </Label>
              <Input
                type="number"
                value={config.ai_credits.copilot}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ai_credits: {
                      ...c.ai_credits,
                      copilot: parseInt(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 border-[#131B35] bg-[#131B35] text-white"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Número de créditos IA mensais por plano. Use -1 para ilimitado.
          </p>
        </CardContent>
      </Card>

      {/* Default Password */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Key className="h-5 w-5 text-[#1D4ED8]" />
            Senha Padrão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Input
              type={showDefaultPassword ? 'text' : 'password'}
              value={config.default_password}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  default_password: e.target.value,
                }))
              }
              className="border-[#131B35] bg-[#131B35] pr-10 text-white"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              onClick={() => setShowDefaultPassword(!showDefaultPassword)}
            >
              {showDefaultPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Senha atribuída a novos usuários criados via webhook.
          </p>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <ToggleLeft className="h-5 w-5 text-[#1D4ED8]" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FeatureFlagRow
              label="Busca Semântica"
              description="Habilitar busca por similaridade de embeddings nos scripts"
              checked={config.feature_flags.enable_semantic_search}
              onCheckedChange={(checked) =>
                setConfig((c) => ({
                  ...c,
                  feature_flags: {
                    ...c.feature_flags,
                    enable_semantic_search: checked,
                  },
                }))
              }
            />
            <FeatureFlagRow
              label="Áudio"
              description="Habilitar geração e reprodução de áudio dos scripts"
              checked={config.feature_flags.enable_audio}
              onCheckedChange={(checked) =>
                setConfig((c) => ({
                  ...c,
                  feature_flags: {
                    ...c.feature_flags,
                    enable_audio: checked,
                  },
                }))
              }
            />
            <FeatureFlagRow
              label="Exportação"
              description="Habilitar exportação de scripts em PDF/WhatsApp"
              checked={config.feature_flags.enable_export}
              onCheckedChange={(checked) =>
                setConfig((c) => ({
                  ...c,
                  feature_flags: {
                    ...c.feature_flags,
                    enable_export: checked,
                  },
                }))
              }
            />
            <FeatureFlagRow
              label="Agenda Inteligente"
              description="Habilitar a funcionalidade de agenda de vendas inteligente"
              checked={config.feature_flags.enable_smart_agenda}
              onCheckedChange={(checked) =>
                setConfig((c) => ({
                  ...c,
                  feature_flags: {
                    ...c.feature_flags,
                    enable_smart_agenda: checked,
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Referral Rewards */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Gift className="h-5 w-5 text-[#1D4ED8]" />
            Recompensas de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 1 referral */}
            <div className="flex items-center gap-4 rounded-lg border border-[#131B35] bg-[#131B35]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-sm font-bold text-[#1D4ED8]">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  1 indicação convertida
                </p>
                <p className="text-xs text-gray-500">
                  Tipo: Créditos IA
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Créditos:</Label>
                <Input
                  type="number"
                  value={config.referral_rewards['1'].value}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      referral_rewards: {
                        ...c.referral_rewards,
                        '1': {
                          ...c.referral_rewards['1'],
                          value: parseInt(e.target.value) || 0,
                        },
                      },
                    }))
                  }
                  className="w-20 border-[#131B35] bg-[#020617] text-white"
                />
              </div>
            </div>

            {/* 3 referrals */}
            <div className="flex items-center gap-4 rounded-lg border border-[#131B35] bg-[#131B35]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-sm font-bold text-[#1D4ED8]">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  3 indicações convertidas
                </p>
                <p className="text-xs text-gray-500">
                  Tipo: Mês Plus grátis
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Meses:</Label>
                <Input
                  type="number"
                  value={config.referral_rewards['3'].value}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      referral_rewards: {
                        ...c.referral_rewards,
                        '3': {
                          ...c.referral_rewards['3'],
                          value: parseInt(e.target.value) || 0,
                        },
                      },
                    }))
                  }
                  className="w-20 border-[#131B35] bg-[#020617] text-white"
                />
              </div>
            </div>

            {/* 10 referrals */}
            <div className="flex items-center gap-4 rounded-lg border border-[#131B35] bg-[#131B35]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-sm font-bold text-[#1D4ED8]">
                10
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  10 indicações convertidas
                </p>
                <p className="text-xs text-gray-500">
                  Tipo: Mês Pro grátis
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Meses:</Label>
                <Input
                  type="number"
                  value={config.referral_rewards['10'].value}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      referral_rewards: {
                        ...c.referral_rewards,
                        '10': {
                          ...c.referral_rewards['10'],
                          value: parseInt(e.target.value) || 0,
                        },
                      },
                    }))
                  }
                  className="w-20 border-[#131B35] bg-[#020617] text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

function FeatureFlagRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#131B35] bg-[#131B35]/50 p-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
