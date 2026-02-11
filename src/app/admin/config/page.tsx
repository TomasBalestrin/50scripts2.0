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

interface PlatformConfigData {
  token: string;
  products: {
    starter: string;
    pro: string;
    premium: string;
    copilot: string;
  };
}

interface WebhookEndpoint {
  name: string;
  path: string;
  auth: { header: string; envVar: string; configured: boolean };
  description: string;
  events: string[];
}

interface ProductMapping {
  label: string;
  envVar: string;
  configured: boolean;
}

interface Platform {
  id: string;
  name: string;
  path: string;
  auth: { header: string; envVar: string; configured: boolean };
  events: string[];
  description: string;
  products: Record<string, ProductMapping>;
  setupSteps: string[];
}

interface WebhookStatus {
  baseUrl: string | null;
  envStatus: Record<string, boolean>;
  platforms: Platform[];
  genericEndpoints: WebhookEndpoint[];
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
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfigData>>({
    hotmart: { token: '', products: { starter: '', pro: '', premium: '', copilot: '' } },
    kiwify: { token: '', products: { starter: '', pro: '', premium: '', copilot: '' } },
    pagtrust: { token: '', products: { starter: '', pro: '', premium: '', copilot: '' } },
  });
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

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
          'platform_hotmart',
          'platform_kiwify',
          'platform_pagtrust',
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

        // Load platform configs
        const platforms: Record<string, PlatformConfigData> = { ...platformConfigs };
        for (const pid of ['hotmart', 'kiwify', 'pagtrust']) {
          const val = configMap[`platform_${pid}`] as PlatformConfigData | undefined;
          if (val) {
            platforms[pid] = {
              token: val.token || '',
              products: {
                starter: val.products?.starter || '',
                pro: val.products?.pro || '',
                premium: val.products?.premium || '',
                copilot: val.products?.copilot || '',
              },
            };
          }
        }
        setPlatformConfigs(platforms);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const entries: Array<{ key: string; value: unknown }> = [
        { key: 'webhook_secret', value: { value: config.webhook_secret } },
        { key: 'ai_credits', value: config.ai_credits },
        { key: 'default_password', value: { value: config.default_password } },
        { key: 'feature_flags', value: config.feature_flags },
        { key: 'referral_rewards', value: config.referral_rewards },
      ];

      // Save platform configs
      for (const [pid, pConfig] of Object.entries(platformConfigs)) {
        entries.push({ key: `platform_${pid}`, value: pConfig });
      }

      const now = new Date().toISOString();
      await Promise.all(
        entries.map((entry) =>
          supabase
            .from('app_config')
            .upsert(
              { key: entry.key, value: entry.value, updated_at: now },
              { onConflict: 'key' }
            )
        )
      );

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
      {/* WEBHOOK INTEGRATION - PER PLATFORM */}
      {/* ============================================ */}
      {webhookStatusLoading ? (
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Platform Webhooks */}
          {webhookStatus?.platforms.map((platform) => {
            const allProductsConfigured = Object.values(platform.products).every(p => p.configured);
            const isReady = platform.auth.configured && allProductsConfigured;

            return (
              <Card key={platform.id} className="border-[#131B35] bg-[#0A0F1E]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Webhook className="h-5 w-5 text-[#1D4ED8]" />
                      {platform.name}
                    </CardTitle>
                    <Badge
                      className={`text-[10px] ${
                        isReady
                          ? 'border-green-800 bg-green-900/30 text-green-400'
                          : 'border-amber-800 bg-amber-900/30 text-amber-400'
                      }`}
                    >
                      {isReady ? 'Pronto' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{platform.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* URL com botão copiar */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">URL do Webhook</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-md border border-[#131B35] bg-[#020617] px-3 py-2">
                        <code className="block truncate text-xs text-[#3B82F6]">
                          {baseUrl}{platform.path}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-gray-400 hover:text-white"
                        onClick={() => copyToClipboard(`${baseUrl}${platform.path}`, platform.path)}
                      >
                        {copiedField === platform.path ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Token de autenticação */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Token de Autenticação
                      <code className="ml-1.5 text-[10px] text-gray-600">({platform.auth.header})</code>
                    </label>
                    <div className="relative">
                      <Input
                        type={showTokens[platform.id] ? 'text' : 'password'}
                        value={platformConfigs[platform.id]?.token || ''}
                        onChange={(e) =>
                          setPlatformConfigs((prev) => ({
                            ...prev,
                            [platform.id]: { ...prev[platform.id], token: e.target.value },
                          }))
                        }
                        placeholder={`Token ${platform.name}...`}
                        className="border-[#131B35] bg-[#131B35] pr-10 text-white placeholder:text-gray-600"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        onClick={() => setShowTokens((prev) => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                      >
                        {showTokens[platform.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* IDs de Produto */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">IDs dos Produtos</label>
                    <div className="space-y-2">
                      {Object.entries(platform.products).map(([planKey, prod]) => (
                        <div key={prod.envVar} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs font-medium text-white">{prod.label}</span>
                          <Input
                            type="text"
                            value={platformConfigs[platform.id]?.products?.[planKey as keyof PlatformConfigData['products']] || ''}
                            onChange={(e) =>
                              setPlatformConfigs((prev) => ({
                                ...prev,
                                [platform.id]: {
                                  ...prev[platform.id],
                                  products: {
                                    ...prev[platform.id].products,
                                    [planKey]: e.target.value,
                                  },
                                },
                              }))
                            }
                            placeholder={`ID do produto ${prod.label}`}
                            className="border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-600 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Eventos suportados */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Eventos</label>
                    <div className="flex flex-wrap gap-1">
                      {platform.events.map((event) => (
                        <Badge
                          key={event}
                          className="border-[#131B35] bg-[#020617] text-[10px] text-gray-400"
                        >
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Setup instructions */}
                  <div className="rounded-lg border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 p-3">
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#3B82F6]">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Como configurar
                    </h4>
                    <ol className="space-y-1.5">
                      {platform.setupSteps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[11px] text-gray-400">
                          <span className="shrink-0 font-bold text-[#3B82F6]">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Generic endpoints */}
          {webhookStatus?.genericEndpoints && webhookStatus.genericEndpoints.length > 0 && (
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Webhook className="h-5 w-5 text-gray-500" />
                  Webhooks Genéricos
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Endpoints auxiliares para integração manual ou com outras plataformas.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {webhookStatus.genericEndpoints.map((endpoint) => (
                  <div key={endpoint.path} className="rounded-lg border border-[#131B35] bg-[#020617] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{endpoint.name}</p>
                        <Badge
                          className={`text-[10px] ${
                            endpoint.auth.configured
                              ? 'border-green-800 bg-green-900/30 text-green-400'
                              : 'border-amber-800 bg-amber-900/30 text-amber-400'
                          }`}
                        >
                          {endpoint.auth.configured ? 'Pronto' : 'Falta config'}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">{endpoint.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-md border border-[#131B35] bg-[#0A0F1E] px-3 py-1.5">
                        <code className="block truncate text-[11px] text-[#3B82F6]">
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
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="text-[10px] text-gray-500">{endpoint.auth.header}</code>
                      <div className="flex flex-wrap gap-1">
                        {endpoint.events.map((e) => (
                          <Badge key={e} className="border-[#131B35] bg-[#131B35] text-[10px] text-gray-400">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

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
