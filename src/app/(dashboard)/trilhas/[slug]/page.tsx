'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Script, ScriptCategory } from '@/types/database';
import { useAuth } from '@/hooks/use-auth';
import { PLAN_HIERARCHY } from '@/lib/constants';
import { ScriptCard } from '@/components/scripts/script-card';
import { Card, CardContent } from '@/components/ui/card';

interface TrailStats {
  trafficInvestment: number;
  costPerLead: number;
  leadsCount: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

interface CategoryWithScripts {
  category: ScriptCategory;
  scripts: Script[];
}

function SkeletonHeader() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-24 rounded bg-[#131B35]" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-[#131B35]" />
          <div className="h-4 w-72 rounded bg-[#131B35]" />
        </div>
      </div>
    </div>
  );
}

function SkeletonScriptCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <div className="mb-3 h-4 w-3/4 rounded bg-[#131B35]" />
      <div className="mb-2 h-3 w-full rounded bg-[#131B35]" />
      <div className="mb-3 h-3 w-2/3 rounded bg-[#131B35]" />
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-12 rounded-full bg-[#131B35]" />
        ))}
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function TrailScriptsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { profile } = useAuth();

  const [data, setData] = useState<CategoryWithScripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptIdsWithSales, setScriptIdsWithSales] = useState<Set<string>>(new Set());
  const [trailStats, setTrailStats] = useState<TrailStats | null>(null);

  useEffect(() => {
    async function fetchCategoryScripts() {
      try {
        const res = await fetch(`/api/categories/${slug}/scripts`);
        if (res.ok) {
          const json = await res.json();
          setData(json);

          // Fetch user's sales and trail stats in parallel
          const scriptIds = (json.scripts || []).map((s: Script) => s.id);
          if (scriptIds.length > 0) {
            try {
              const [salesRes, statsRes] = await Promise.all([
                fetch(`/api/scripts/sales-check?ids=${scriptIds.join(',')}`),
                fetch(`/api/categories/${slug}/stats`),
              ]);
              if (salesRes.ok) {
                const salesData = await salesRes.json();
                setScriptIdsWithSales(new Set(salesData.scriptIds || []));
              }
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                setTrailStats(statsData);
              }
            } catch {
              // Non-critical
            }
          }
        }
      } catch (err) {
        console.error('Error fetching category scripts:', err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchCategoryScripts();
    }
  }, [slug]);

  const userPlanLevel = profile?.plan ? PLAN_HIERARCHY[profile.plan] : 0;

  function isLocked(script: Script): boolean {
    const scriptPlanLevel = PLAN_HIERARCHY[script.min_plan] ?? 0;
    return scriptPlanLevel > userPlanLevel;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <SkeletonHeader />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonScriptCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.push('/trilhas')}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Trilhas
          </button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-[#94A3B8]">Trilha não encontrada</p>
          </div>
        </div>
      </div>
    );
  }

  const { category, scripts } = data;

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Back button */}
        <button
          onClick={() => router.push('/trilhas')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Trilhas
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{category.name}</h1>
              <p className="mt-1 text-sm text-[#94A3B8]">{category.description}</p>
            </div>
          </div>
          <div
            className="mt-4 h-1 w-20 rounded-full"
            style={{ backgroundColor: category.color }}
          />
        </div>

        {/* Scripts grid */}
        {scripts.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {scripts.map((script) => (
              <motion.div key={script.id} variants={itemVariants}>
                <ScriptCard
                  script={{ ...script, category }}
                  locked={isLocked(script)}
                  hasSale={scriptIdsWithSales.has(script.id)}
                  onClick={() => {
                    if (!isLocked(script)) {
                      router.push(`/scripts/${script.id}`);
                    }
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-[#94A3B8]">Nenhum script nesta trilha</p>
            <p className="mt-1 text-sm text-[#94A3B8]/70">
              Scripts serão adicionados em breve.
            </p>
          </div>
        )}

        {/* Traffic Investment Card */}
        {trailStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardContent className="p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
                  Investimento em Tráfego
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[#131B35]/50 bg-[#020617] p-4">
                    <p className="text-xs font-medium text-[#94A3B8]">Total Investido</p>
                    <p className="mt-1 text-2xl font-bold text-[#8B5CF6]">
                      {formatCurrency(trailStats.trafficInvestment)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#131B35]/50 bg-[#020617] p-4">
                    <p className="text-xs font-medium text-[#94A3B8]">Custo por Lead</p>
                    <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
                      {trailStats.costPerLead > 0
                        ? formatCurrency(trailStats.costPerLead)
                        : 'R$ 0,00'}
                    </p>
                    <p className="mt-1 text-[10px] text-[#64748B]">
                      investimento / scripts usados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
