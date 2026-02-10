'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plan, Profile } from '@/types/database';
import { PLAN_LABELS, PLAN_PRICES, PLAN_COLORS, PLAN_HIERARCHY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Sparkles, Zap, Crown, Rocket, Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';

const PLAN_FEATURES: Record<Plan, string[]> = {
  starter: [
    '50 Scripts em 8 Trilhas',
    'Copiar com 1 clique',
    'Modo Emergencia (FAB)',
    'Banco de Objecoes',
    'Microlearning Tips',
    'Onboarding com Quick Win',
  ],
  pro: [
    'Tudo do Starter +',
    'Dashboard de Faturamento',
    'Variaveis Auto-preenchidas',
    'Variacoes de Tom (3 estilos)',
    'Gamificacao + Desafios Diarios',
    'Agenda de Vendas',
    'Metricas de Comunidade',
    'Chrome Extension WhatsApp',
    'PWA Offline',
    'Notificacoes Push',
  ],
  premium: [
    'Tudo do Pro +',
    'Pipeline Visual de Leads',
    'Historico de Conversa/Lead',
    'IA Geracao (15 cred/mes)',
    'Busca Semantica de Objecoes',
    'Audios Modelo',
    'Cards de Resultado',
    'Sistema de Referral',
    'Colecoes Pessoais',
  ],
  copilot: [
    'Tudo do Premium +',
    'IA Conversacional',
    'IA Ilimitada',
    'Analise de Padroes Mensal',
    'Agenda Inteligente com Leads',
    'Exportacao CSV/PDF',
    'Early Access',
    'Suporte Prioritario',
  ],
};

const HOTMART_LINKS: Partial<Record<Plan, string>> = {
  pro: 'https://pay.hotmart.com/O104359778G?off=otimmy2t&checkoutMode=10&bid=1770724637744',
  premium: 'https://pay.hotmart.com/P104359833G?off=5fb1b0vk&checkoutMode=10',
  copilot: 'https://pay.hotmart.com/A104359906D?off=l5swf15r&checkoutMode=10',
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
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle success/cancelled query params
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');

    if (success === 'true') {
      setMessage({
        type: 'success',
        text: 'Pagamento realizado com sucesso! Seu plano foi atualizado.',
      });
    } else if (cancelled === 'true') {
      setMessage({
        type: 'error',
        text: 'Pagamento cancelado. Voce pode tentar novamente quando quiser.',
      });
    }
  }, [searchParams]);

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

  // Auto-dismiss message after 8 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function handleCheckout(plan: string) {
    try {
      setCheckoutLoading(plan);
      setMessage(null);

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar sessao de pagamento.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao processar pagamento. Tente novamente.',
      });
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    try {
      setPortalLoading(true);
      setMessage(null);

      const response = await fetch('/api/payments/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao abrir portal de assinatura.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao abrir portal. Tente novamente.',
      });
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-[#0A0F1E] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = profile?.plan || 'starter';
  const hasStripeSubscription = !!profile?.stripe_customer_id;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Escolha seu plano</h1>
        <p className="text-gray-400">
          Desbloqueie funcionalidades poderosas e venda mais pelo WhatsApp
        </p>
      </div>

      {/* Success/Error message banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Manage subscription button for existing subscribers */}
      {hasStripeSubscription && currentPlan !== 'starter' && (
        <div className="mb-6 flex justify-center">
          <Button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="bg-[#131B35] hover:bg-[#131B35] text-white border border-[#131B35] hover:border-[#1D4ED8]/50 transition-all"
          >
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Abrindo portal...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Gerenciar Assinatura
              </>
            )}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['pro', 'premium', 'copilot'] as Plan[]).map((plan) => {
          const isCurrentPlan = currentPlan === plan;
          const isUpgrade = PLAN_HIERARCHY[plan] > PLAN_HIERARCHY[currentPlan];
          const isDowngrade = PLAN_HIERARCHY[plan] < PLAN_HIERARCHY[currentPlan];
          const isPopular = plan === 'premium';
          const isLoadingThis = checkoutLoading === plan;

          return (
            <Card
              key={plan}
              className={`relative bg-[#0A0F1E] border-2 transition-all ${
                isCurrentPlan
                  ? 'border-[#1D4ED8] shadow-lg shadow-[#1D4ED8]/20'
                  : isPopular
                  ? 'border-purple-500/50'
                  : 'border-[#131B35]'
              }`}
            >
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-3">Mais Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#1D4ED8] text-white px-3">Plano Atual</Badge>
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
                  Cobrado mensalmente
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
                    <Button disabled className="w-full bg-[#131B35] text-gray-400">
                      Plano Atual
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ backgroundColor: PLAN_COLORS[plan] }}
                      onClick={() => {
                        const url = HOTMART_LINKS[plan];
                        if (url) {
                          window.open(url, '_blank');
                        } else {
                          handleCheckout(plan);
                        }
                      }}
                      disabled={checkoutLoading !== null}
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecionando...
                        </>
                      ) : (
                        'Assinar'
                      )}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full border-[#131B35] text-gray-500"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Incluido
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
