'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Script } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Copy, Check } from 'lucide-react';

export default function BuscaPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // SWR for search results - only fetch when query has 2+ characters
  const { data: searchData, isLoading: loading } = useSWR<{ scripts: Script[] }>(
    debouncedQuery.length >= 2 ? `/api/scripts/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    { revalidateOnFocus: false, dedupingInterval: 1000 }
  );
  const results = searchData?.scripts || [];

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  const handleCopy = async (script: Script) => {
    await navigator.clipboard.writeText(script.content);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Register usage (fire-and-forget)
    fetch(`/api/scripts/${script.id}/use`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Buscar Scripts</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Busque por título, conteúdo ou situação..."
          className="pl-10 bg-[#0A0F1E] border-[#131B35] text-white h-12 text-lg"
          type="search"
          inputMode="search"
          autoFocus
          aria-label="Buscar scripts"
          role="searchbox"
        />
      </div>

      {loading && (
        <div className="space-y-3" aria-label="Carregando resultados">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#0A0F1E] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && debouncedQuery.length >= 2 && results.length === 0 && (
        <div className="text-center py-12" role="status">
          <Search className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhum script encontrado para &quot;{debouncedQuery}&quot;</p>
        </div>
      )}

      <div className="space-y-3" role="list" aria-label="Resultados da busca">
        {results.map((script) => (
          <Card
            key={script.id}
            className="bg-[#0A0F1E] border-[#131B35] hover:border-[#1E2A52] transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-[#1D4ED8]"
            role="listitem"
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1"
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver script: ${script.title}`}
                  onClick={() => router.push(`/scripts/${script.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/scripts/${script.id}`); }}
                >
                  <h3 className="font-semibold text-white mb-1">{script.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{script.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {script.tags?.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-[#131B35] text-gray-300 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {script.global_effectiveness > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-400">
                          {script.global_effectiveness.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(script);
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-[#131B35] hover:bg-[#1D4ED8] transition-colors"
                  aria-label={`Copiar script: ${script.title}`}
                >
                  {copiedId === script.id ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
