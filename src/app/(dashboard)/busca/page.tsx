'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Script } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Copy, Check } from 'lucide-react';

export default function BuscaPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/scripts/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.scripts || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleCopy = async (script: Script) => {
    await navigator.clipboard.writeText(script.content);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Register usage
    fetch(`/api/scripts/${script.id}/use`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Buscar Scripts</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque por título, conteúdo ou situação..."
          className="pl-10 bg-[#1A1A2E] border-[#252542] text-white h-12 text-lg"
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#1A1A2E] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhum script encontrado para &quot;{query}&quot;</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((script) => (
          <Card
            key={script.id}
            className="bg-[#1A1A2E] border-[#252542] hover:border-[#363660] transition-colors cursor-pointer"
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1"
                  onClick={() => router.push(`/scripts/${script.id}`)}
                >
                  <h3 className="font-semibold text-white mb-1">{script.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{script.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {script.tags?.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-[#252542] text-gray-300 text-xs"
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
                  className="flex-shrink-0 p-2 rounded-lg bg-[#252542] hover:bg-[#E94560] transition-colors"
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
