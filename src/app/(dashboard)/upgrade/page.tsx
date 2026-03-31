'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Loader2, Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PLAN_LABELS, PLAN_PRICES, PLAN_COLORS } from '@/lib/constants';
import type { Plan } from '@/types/database';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanInfo {
  plan: Plan;
  label: string;
  price: string;
  color: string;
  icon: React.ReactNode;
  highlight?: boolean;
  features: PlanFeature[];
}

const PLANS: PlanInfo[] = [
  {
    plan: 'starter',
    label: PLAN_LABELS.starter,
    price: PLAN_PRICES.starter,
    color: PLAN_COLORS.starter,
    icon: <Shield className="h-6 w-6" />,
    features: [
      { text: '50+ scripts persuasivos', included: true },
      { text: '8 trilhas estratégicas', included: true },
      { text: 'Modo Emergência (FAB)', included: true },
      { text: 'Banco de objeções', included: true },
      { text: 'Microlearning diário', included: true },
      { text: 'PWA instalável', included: true },
    ],
  },
  {
    plan: 'pro',
    label: PLAN_LABELS.pro,
    price: PLAN_PRICES.pro,
    color: PLAN_COLORS.pro,
    icon: <Sparkles className="h-6 w-6" />,
    highlight: true,
    features: [
      { text: 'Tudo do Starter', included: true },
      { text: 'Dashboard de faturamento', included: true },
      { text: 'Variações de tom', included: true },
      { text: 'Gamificação + Desafios', included: true },
      { text: 'Agenda de vendas', included: true },
      { text: 'Métricas da comunidade', included: true },
      { text: 'Push notifications', included: true },
      { text: '15 scripts IA/mês', included: true },
    ],
  },
  {
    plan: 'premium',
    label: PLAN_LABELS.premium,
    price: PLAN_PRICES.premium,
    color: PLAN_COLORS.premium,
    icon: <Crown className="h-6 w-6" />,
    features: [
      { text: 'Tudo do Plus', included: true },
      { text: 'Pipeline de leads (Kanban)', included: true },
      { text: 'IA generativa (30/mês)', included: true },
      { text: 'Busca semântica', included: true },
      { text: 'Áudios modelo', included: true },
      { text: 'Coleções pessoais', included: true },
      { text: 'Sistema de referrals', included: true },
      { text: 'Cards de resultado', included: true },
    ],
  },
  {
    plan: 'copilot',
    label: PLAN_LABELS.copilot,
    price: PLAN_PRICES.copilot,
    color: PLAN_COLORS.copilot,
    icon: <Zap className="h-6 w-6" />,
    features: [
      { text: 'Tudo do Pro', included: true },
      { text: 'IA conversacional', included: true },
      { text: 'Análise de padrões', included: true },
      { text: 'IA ilimitada', included: true },
      { text: 'Agenda inteligente', included: true },
      { text: 'Exportação CSV/PDF', included: true },
      { text: 'Acesso antecipado', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
  },
];

export default function UpgradePage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>('starter');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setCurrentPlan(data.plan || 'starter');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    if (plan === currentPlan) return;
    setCheckoutLoading(plan);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch {
      // Ignore
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Escolha seu plano
          </h1>
          <p className="mt-2 text-[#94A3B8]">
            Desbloqueie funcionalidades e venda mais
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const isCurrent = p.plan === currentPlan;
            const isLower =
              ['starter', 'pro', 'premium', 'copilot'].indexOf(p.plan) <=
              ['starter', 'pro', 'premium', 'copilot'].indexOf(currentPlan);

            return (
              <Card
                key={p.plan}
                className={`relative border bg-[#0A0F1E] ${
                  p.highlight
                    ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]/30'
                    : 'border-[#131B35]'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1D4ED8] px-3 py-0.5 text-xs font-semibold text-white">
                    Mais popular
                  </div>
                )}
                <CardContent className="flex flex-col p-5">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${p.color}20`, color: p.color }}
                  >
                    {p.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{p.label}</h3>
                  <p className="mb-4 text-sm text-[#94A3B8]">{p.price}</p>

                  <ul className="mb-6 flex-1 space-y-2">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check
                          className="mt-0.5 h-4 w-4 flex-shrink-0"
                          style={{ color: p.color }}
                        />
                        <span className="text-[#CBD5E1]">{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(p.plan)}
                    disabled={isCurrent || isLower || checkoutLoading !== null}
                    className={`w-full font-semibold ${
                      isCurrent
                        ? 'bg-[#131B35] text-[#94A3B8] cursor-default'
                        : isLower
                        ? 'bg-[#131B35] text-[#64748B] cursor-not-allowed'
                        : 'bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90'
                    }`}
                  >
                    {checkoutLoading === p.plan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Plano atual'
                    ) : isLower ? (
                      'Incluído'
                    ) : (
                      'Fazer upgrade'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
