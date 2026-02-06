'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Check, Star, AlertCircle } from 'lucide-react';
import type { Script } from '@/types/database';

interface ObjectionSearchResult extends Script {
  relevance_score?: number;
}

export function ObjectionSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ObjectionSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchObjections = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.trim().length < 3) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetch('/api/scripts/objection-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Falha na busca');
      }

      const data = await response.json();
      setResults(data.scripts ?? data.results ?? []);
      setHasSearched(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      console.error('Objection search error:', error);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search as user types
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        searchObjections(value);
      }, 300);
    },
    [searchObjections]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      searchObjections(query);
    },
    [query, searchObjections]
  );

  const handleCopy = useCallback(async (scriptId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(scriptId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const renderStars = (effectiveness: number) => {
    const fullStars = Math.round(effectiveness * 5);
    return (
      <div className="flex items-center gap-0.5" aria-label={`${fullStars} de 5 estrelas`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < fullStars
                ? 'text-[#F59E0B] fill-[#F59E0B]'
                : 'text-white/20'
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder='O lead disse que...'
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#252542] border border-white/10
                       text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2
                       focus:ring-[#E94560]/50 focus:border-[#E94560]/50 transition-all"
            aria-label="Buscar objeção"
          />
        </div>
      </form>

      {/* Results area */}
      <div className="mt-4">
        {/* Loading skeleton */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#252542] border border-white/5 animate-pulse"
                >
                  <div className="h-4 w-2/3 bg-white/10 rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-white/5 rounded" />
                    <div className="h-3 w-5/6 bg-white/5 rounded" />
                    <div className="h-3 w-3/4 bg-white/5 rounded" />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-8 w-20 bg-white/5 rounded-lg" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Results list */}
          {!isLoading && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {results.map((script, index) => (
                <motion.div
                  key={script.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group p-4 rounded-xl bg-[#252542] border border-white/5
                             hover:border-[#E94560]/20 transition-colors"
                >
                  {/* Title */}
                  <h3 className="text-sm font-semibold text-white leading-tight mb-2">
                    {script.title}
                  </h3>

                  {/* Content preview (truncated) */}
                  <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
                    {script.content}
                  </p>

                  {/* Footer: effectiveness + copy */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      {renderStars(script.global_effectiveness)}
                      <span className="text-[10px] text-white/40">
                        {Math.round(script.global_effectiveness * 100)}% eficácia
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(script.id, script.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                 font-semibold transition-all duration-200
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E94560]"
                      style={{
                        background:
                          copiedId === script.id
                            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #E94560 0%, #c7374e 100%)',
                        color: 'white',
                      }}
                    >
                      {copiedId === script.id ? (
                        <>
                          <Check size={12} />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          COPIAR
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!isLoading && hasSearched && results.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#252542] mb-4">
                <AlertCircle size={24} className="text-white/30" />
              </div>
              <p className="text-sm text-white/50 font-medium">
                Nenhum script encontrado para essa objeção
              </p>
              <p className="text-xs text-white/30 mt-1">
                Tente reformular a busca ou use termos diferentes
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
