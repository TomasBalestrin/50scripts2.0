'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Star, BarChart3 } from 'lucide-react';

interface CommunityData {
  top_scripts: Array<{
    id: string;
    title: string;
    category_name: string;
    global_effectiveness: number;
    global_conversion_rate: number;
    global_usage_count: number;
  }>;
  insights: string[];
  avg_conversion_rate: number;
}

export function CommunityInsights() {
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/community');
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#1A1A2E] border-[#252542]">
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[#252542] rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-[#1A1A2E] border-[#252542]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Users className="w-5 h-5 text-[#E94560]" />
          Métricas da Comunidade
        </CardTitle>
        <p className="text-xs text-gray-400">
          Dados anônimos de {data.top_scripts[0]?.global_usage_count || 0}+ vendedores
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insights */}
        {data.insights.length > 0 && (
          <div className="space-y-2">
            {data.insights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 bg-[#252542] rounded-lg"
              >
                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-300">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top Scripts */}
        <div>
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            Scripts mais efetivos
          </p>
          <div className="space-y-2">
            {data.top_scripts.slice(0, 5).map((script, i) => (
              <div
                key={script.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                <span className="text-gray-300 flex-1 truncate">
                  {script.title}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-gray-400">
                    {script.global_effectiveness.toFixed(1)}
                  </span>
                </div>
                <Badge className="bg-green-500/10 text-green-400 text-[10px] px-1.5">
                  {script.global_conversion_rate.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Average conversion */}
        <div className="pt-2 border-t border-[#252542] text-center">
          <p className="text-xs text-gray-400">Taxa média de conversão</p>
          <p className="text-lg font-bold text-[#E94560]">
            {data.avg_conversion_rate.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
