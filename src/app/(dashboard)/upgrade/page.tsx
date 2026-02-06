'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plan, Profile } from '@/types/database';
import { PLAN_LABELS, PLAN_PRICES, PLAN_COLORS, PLAN_HIERARCHY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Sparkles, Zap, Crown, Rocket } from 'lucide-react';

const PLAN_FEATURES: Record<Plan, string[]> = {
  starter: [
    '50 Scripts em 8 Trilhas',
    'Copiar com 1 clique',
    'Modo Emergência (FAB)',
    'Banco de Objeções',
    'Microlearning Tips',
    'Onboarding com Quick Win',
  ],
  pro: [
    'Tudo do Starter +',
    'Dashboard de Faturamento',
    'Variáveis Auto-preenchidas',
    'Variações de Tom (3 estilos)',
    'Gamificação + Desafios Diários',
    'Agenda de Vendas',
    'Métricas de Comunidade',
    'Chrome Extension WhatsApp',
    'PWA Offline',
    'Notificações Push',
  ],
  premium: [
    'Tudo do Pro +',
    'Pipeline Visual de Leads',
    'Histórico de Conversa/Lead',
    'IA Geração (15 créd/mês)',
    'Busca Semântica de Objeções',
    'Áudios Modelo',
    'Cards de Resultado',
    'Sistema de Referral',
    'Coleções Pessoais',
  ],
  copilot: [
    'Tudo do Premium +',
    'IA Conversacional',
    'IA Ilimitada',
    'Análise de Padrões Mensal',
    'Agenda Inteligente com Leads',
    'Exportação CSV/PDF',
    'Early Access',
    'Suporte Prioritário',
  ],
};

const PLAN_ICONS: Record<Plan, React.ReactNode> = {
  starter: <Zap className="w-6 h-6" />,
  pro: <Sparkles className="w-6 h-6" />,
  premium: <Crown className="w-6 h-6" />,
  copilot: <Rocket className="w-6 h-6" />,
};

export default function UpgradePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-[#1A1A2E] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = profile?.plan || 'starter';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Escolha seu plano</h1>
        <p className="text-gray-400">
          Desbloqueie funcionalidades poderosas e venda mais pelo WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['starter', 'pro', 'premium', 'copilot'] as Plan[]).map((plan) => {
          const isCurrentPlan = currentPlan === plan;
          const isUpgrade = PLAN_HIERARCHY[plan] > PLAN_HIERARCHY[currentPlan];
          const isDowngrade = PLAN_HIERARCHY[plan] < PLAN_HIERARCHY[currentPlan];
          const isPopular = plan === 'premium';

          return (
            <Card
              key={plan}
              className={`relative bg-[#1A1A2E] border-2 transition-all ${
                isCurrentPlan
                  ? 'border-[#E94560] shadow-lg shadow-[#E94560]/20'
                  : isPopular
                  ? 'border-purple-500/50'
                  : 'border-[#252542]'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-3">Mais Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#E94560] text-white px-3">Plano Atual</Badge>
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: PLAN_COLORS[plan] + '20', color: PLAN_COLORS[plan] }}
                >
                  {PLAN_ICONS[plan]}
                </div>
                <CardTitle className="text-white text-xl">{PLAN_LABELS[plan]}</CardTitle>
                <p className="text-2xl font-bold text-white mt-2">{PLAN_PRICES[plan]}</p>
                <p className="text-xs text-gray-400">
                  {plan === 'starter' ? 'Pagamento único' : 'Cobrado mensalmente'}
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                {PLAN_FEATURES[plan].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: PLAN_COLORS[plan] }}
                    />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full bg-[#252542] text-gray-400">
                      Plano Atual
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ backgroundColor: PLAN_COLORS[plan] }}
                    >
                      Fazer Upgrade
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full border-[#252542] text-gray-500"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Incluído
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
