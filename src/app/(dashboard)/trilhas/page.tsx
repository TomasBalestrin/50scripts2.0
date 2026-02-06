'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ScriptCategory } from '@/types/database';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#252542] bg-[#1A1A2E] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#252542]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-[#252542]" />
          <div className="h-3 w-1/3 rounded bg-[#252542]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#252542]" />
        <div className="h-3 w-3/4 rounded bg-[#252542]" />
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
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : data.categories ?? []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 animate-pulse">
            <div className="mb-2 h-8 w-48 rounded bg-[#1A1A2E]" />
            <div className="h-4 w-72 rounded bg-[#1A1A2E]" />
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

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Trilhas</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Escolha uma trilha para explorar os scripts de vendas
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
              className="group cursor-pointer overflow-hidden rounded-xl border border-[#252542] bg-[#1A1A2E] transition-colors hover:border-[#E94560]/30"
              style={{ borderLeftWidth: '4px', borderLeftColor: category.color }}
              onClick={() => router.push(`/trilhas/${category.slug}`)}
            >
              <div className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white group-hover:text-[#E94560] transition-colors">
                      {category.name}
                    </h3>
                    {typeof category.scripts_count === 'number' && (
                      <span className="inline-block mt-1 rounded-full bg-[#252542] px-2 py-0.5 text-[10px] font-medium text-[#94A3B8]">
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

        {!loading && categories.length === 0 && (
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
