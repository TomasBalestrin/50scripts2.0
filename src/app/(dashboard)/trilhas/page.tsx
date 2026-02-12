'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ScriptCategory } from '@/types/database';
import { fetcher } from '@/lib/swr/fetcher';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-[#131B35]" />
          <div className="h-3 w-1/3 rounded bg-[#131B35]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#131B35]" />
        <div className="h-3 w-3/4 rounded bg-[#131B35]" />
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TrilhasPage() {
  const router = useRouter();

  const { data: rawData, error, isLoading, mutate } = useSWR<ScriptCategory[] | { categories: ScriptCategory[] }>(
    '/api/categories',
    fetcher
  );

  const categories: ScriptCategory[] = rawData
    ? Array.isArray(rawData) ? rawData : rawData.categories ?? []
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 animate-pulse">
            <div className="mb-2 h-8 w-48 rounded bg-[#0A0F1E]" />
            <div className="h-4 w-72 rounded bg-[#0A0F1E]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-red-400">Erro ao carregar trilhas</p>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Tente recarregar a pagina ou volte em alguns instantes.
            </p>
            <button
              onClick={() => mutate()}
              className="mt-4 rounded-lg bg-[#1D4ED8] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]/90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Trilhas</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Escolha uma trilha para explorar os scripts de vendas
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="grid"
          aria-label="Lista de trilhas de vendas"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {categories.map((category) => (
            <motion.div
              key={category.id}
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="gridcell"
              tabIndex={0}
              aria-label={`Trilha ${category.name}${typeof category.scripts_count === 'number' ? `, ${category.scripts_count} scripts` : ''}`}
              className="group cursor-pointer overflow-hidden rounded-xl border border-[#131B35] bg-[#0A0F1E] transition-colors hover:border-[#1D4ED8]/30 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              style={{ borderLeftWidth: '4px', borderLeftColor: category.color }}
              onClick={() => router.push(`/trilhas/${category.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/trilhas/${category.slug}`);
                }
              }}
            >
              <div className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white group-hover:text-[#1D4ED8] transition-colors">
                      {category.name}
                    </h3>
                    {typeof category.scripts_count === 'number' && (
                      <span className="inline-block mt-1 rounded-full bg-[#131B35] px-2 py-0.5 text-[10px] font-medium text-[#94A3B8]">
                        {category.scripts_count} {category.scripts_count === 1 ? 'script' : 'scripts'}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#94A3B8] line-clamp-3">
                  {category.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {!isLoading && categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-[#94A3B8]">Nenhuma trilha encontrada</p>
            <p className="mt-1 text-sm text-[#94A3B8]/70">
              As trilhas serao adicionadas em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
