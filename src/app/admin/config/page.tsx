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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const defaultConfig: AppConfig = {
  webhook_secret: '',
  ai_credits: {
    starter: 0,
    pro: 0,
    premium: 15,
    copilot: -1,
  },
  default_password: 'Script@123',
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

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90"
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

      {/* Webhook Secret */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Shield className="h-5 w-5 text-[#C9A84C]" />
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
                className="border-[#1A3050] bg-[#1A3050] pr-10 text-white placeholder:text-gray-500"
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
            Usado para validar webhooks de plataformas de pagamento.
          </p>
        </CardContent>
      </Card>

      {/* AI Credits per Plan */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="h-5 w-5 text-[#C9A84C]" />
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
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Pro</Label>
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
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Premium</Label>
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
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">
                Copilot{' '}
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
                className="mt-1 border-[#1A3050] bg-[#1A3050] text-white"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Número de créditos IA mensais por plano. Use -1 para ilimitado.
          </p>
        </CardContent>
      </Card>

      {/* Default Password */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Key className="h-5 w-5 text-[#C9A84C]" />
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
              className="border-[#1A3050] bg-[#1A3050] pr-10 text-white"
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
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <ToggleLeft className="h-5 w-5 text-[#C9A84C]" />
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
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Gift className="h-5 w-5 text-[#C9A84C]" />
            Recompensas de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 1 referral */}
            <div className="flex items-center gap-4 rounded-lg border border-[#1A3050] bg-[#1A3050]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/10 text-sm font-bold text-[#C9A84C]">
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
                  className="w-20 border-[#1A3050] bg-[#0A1628] text-white"
                />
              </div>
            </div>

            {/* 3 referrals */}
            <div className="flex items-center gap-4 rounded-lg border border-[#1A3050] bg-[#1A3050]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/10 text-sm font-bold text-[#C9A84C]">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  3 indicações convertidas
                </p>
                <p className="text-xs text-gray-500">
                  Tipo: Mês Pro grátis
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
                  className="w-20 border-[#1A3050] bg-[#0A1628] text-white"
                />
              </div>
            </div>

            {/* 10 referrals */}
            <div className="flex items-center gap-4 rounded-lg border border-[#1A3050] bg-[#1A3050]/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/10 text-sm font-bold text-[#C9A84C]">
                10
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  10 indicações convertidas
                </p>
                <p className="text-xs text-gray-500">
                  Tipo: Mês Premium grátis
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
                  className="w-20 border-[#1A3050] bg-[#0A1628] text-white"
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
          className="bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90"
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
    <div className="flex items-center justify-between rounded-lg border border-[#1A3050] bg-[#1A3050]/50 p-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
