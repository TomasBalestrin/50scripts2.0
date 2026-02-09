'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Copy, Check, Users, Trophy, Sparkles, ExternalLink } from 'lucide-react';
import { QRCode } from '@/components/shared/qr-code';

interface ReferralData {
  referral_code: string;
  referrals: Array<{
    id: string;
    status: string;
    created_at: string;
    referred: { email: string; full_name: string; plan: string } | null;
  }>;
  stats: { total: number; converted: number; rewarded: number };
  rewards: Array<{ threshold: number; type: string; label: string; unlocked: boolean }>;
}

const REWARD_TIERS = [
  { count: 1, label: '3 creditos IA', icon: Sparkles, color: '#3B82F6' },
  { count: 3, label: '1 mes Pro gratis', icon: Trophy, color: '#8B5CF6' },
  { count: 10, label: '1 mes Premium gratis', icon: Gift, color: '#F59E0B' },
];

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/referrals');
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.referral_code) {
            setReferralLink(`${window.location.origin}?ref=${json.referral_code}`);
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleCopyLink = async () => {
    if (!data?.referral_code) return;
    const link = `${window.location.origin}?ref=${data.referral_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!data?.referral_code) return;
    await navigator.clipboard.writeText(data.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-[#0A0F1E] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gift className="w-6 h-6 text-[#1D4ED8]" />
        Programa de Indicacao
      </h1>

      {/* Referral Link + QR Code */}
      <Card className="bg-gradient-to-br from-[#0A0F1E] to-[#3B82F6]/30 border-[#131B35]">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Link section */}
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-3">Seu link de indicacao</p>
              <div className="flex items-center gap-2 mb-4">
                <code className="flex-1 bg-[#020617] p-3 rounded-lg text-[#1D4ED8] font-mono text-sm truncate">
                  {referralLink || `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${data.referral_code}`}
                </code>
                <Button
                  onClick={handleCopyLink}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex-shrink-0"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-1" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1" /> Copiar</>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="border-[#1E2A52] text-gray-300 hover:bg-[#131B35]"
                >
                  Codigo: {data.referral_code}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#1E2A52] text-gray-300 hover:bg-[#131B35]"
                  onClick={() => {
                    const text = `Conheca o 50 Scripts! Use meu codigo ${data.referral_code} para comecar: ${window.location.origin}?ref=${data.referral_code}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Compartilhar WhatsApp
                </Button>
              </div>
            </div>

            {/* QR Code section */}
            {referralLink && (
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <QRCode
                  value={referralLink}
                  size={140}
                  className="rounded-lg shadow-lg"
                />
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Escaneie para indicar
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-white">{data.stats.total}</p>
            <p className="text-xs text-gray-400">Indicacoes</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <Check className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-white">{data.stats.converted}</p>
            <p className="text-xs text-gray-400">Convertidas</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-4 text-center">
            <Gift className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold text-white">{data.stats.rewarded}</p>
            <p className="text-xs text-gray-400">Recompensas</p>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Tiers */}
      <Card className="bg-[#0A0F1E] border-[#131B35]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Recompensas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {REWARD_TIERS.map((tier) => {
            const unlocked = data.stats.total >= tier.count;
            const progress = Math.min((data.stats.total / tier.count) * 100, 100);
            const Icon = tier.icon;

            return (
              <div
                key={tier.count}
                className={`p-3 rounded-lg ${unlocked ? 'bg-[#131B35]' : 'bg-[#0A0F1E] border border-[#131B35]'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: unlocked ? tier.color + '20' : '#131B35',
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: unlocked ? tier.color : '#6B7280' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-gray-400'}`}>
                      {tier.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tier.count} {tier.count === 1 ? 'indicacao' : 'indicacoes'}
                    </p>
                  </div>
                  {unlocked && (
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      Desbloqueado!
                    </Badge>
                  )}
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Referral History */}
      {data.referrals.length > 0 && (
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Suas Indicacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 bg-[#131B35] rounded-lg"
                >
                  <div>
                    <p className="text-sm text-white">
                      {ref.referred?.full_name || ref.referred?.email || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge
                    className={
                      ref.status === 'rewarded'
                        ? 'bg-green-500/20 text-green-400'
                        : ref.status === 'converted'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }
                  >
                    {ref.status === 'rewarded'
                      ? 'Recompensado'
                      : ref.status === 'converted'
                      ? 'Convertido'
                      : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
