'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Copy,
  Gift,
  Loader2,
  Check,
  Link2,
  Crown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { REFERRAL_REWARDS } from '@/lib/constants';

interface ReferralData {
  referral_code: string;
  referrals: {
    id: string;
    status: string;
    created_at: string;
    referred?: { email: string; full_name: string; plan: string };
  }[];
  stats: {
    total: number;
    converted: number;
    pending: number;
  };
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/login?ref=${data.referral_code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-[#94A3B8]">
        Erro ao carregar indicações
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto max-w-2xl space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Users className="h-6 w-6 text-[#1D4ED8]" /> Indicações
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Indique amigos e ganhe recompensas
          </p>
        </div>

        {/* Referral link */}
        <Card className="border-[#1D4ED8]/30 bg-gradient-to-r from-[#1D4ED8]/10 to-[#3B82F6]/5">
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold text-white">
              Seu link de indicação
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-[#CBD5E1] truncate">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${data.referral_code}`}
              </div>
              <Button
                onClick={handleCopyLink}
                className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-[#64748B]">
              Código: {data.referral_code}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Link2 className="mb-1 h-5 w-5 text-[#3B82F6]" />
              <p className="text-xl font-bold text-white">{data.stats.total}</p>
              <p className="text-[10px] text-[#94A3B8]">Total</p>
            </CardContent>
          </Card>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Check className="mb-1 h-5 w-5 text-[#10B981]" />
              <p className="text-xl font-bold text-white">
                {data.stats.converted}
              </p>
              <p className="text-[10px] text-[#94A3B8]">Convertidos</p>
            </CardContent>
          </Card>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Crown className="mb-1 h-5 w-5 text-[#F59E0B]" />
              <p className="text-xl font-bold text-white">
                {data.stats.pending}
              </p>
              <p className="text-[10px] text-[#94A3B8]">Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Rewards */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Gift className="h-4 w-4 text-[#F59E0B]" /> Recompensas
            </h2>
            <div className="space-y-3">
              {Object.entries(REFERRAL_REWARDS).map(([count, reward]) => {
                const reached = data.stats.total >= Number(count);
                return (
                  <div
                    key={count}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      reached
                        ? 'border-[#10B981]/30 bg-[#10B981]/10'
                        : 'border-[#131B35] bg-[#020617]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {count} {Number(count) === 1 ? 'indicação' : 'indicações'}
                      </p>
                      <p className="text-xs text-[#94A3B8]">{reward.label}</p>
                    </div>
                    {reached ? (
                      <Check className="h-5 w-5 text-[#10B981]" />
                    ) : (
                      <span className="text-xs text-[#64748B]">
                        {Number(count) - data.stats.total} restante(s)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Referral list */}
        {data.referrals.length > 0 && (
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-white">
                Suas indicações
              </h2>
              <div className="space-y-2">
                {data.referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {ref.referred?.full_name || ref.referred?.email || 'Usuário'}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ref.status === 'converted' || ref.status === 'rewarded'
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      }`}
                    >
                      {ref.status === 'pending' ? 'Pendente' : 'Convertido'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
