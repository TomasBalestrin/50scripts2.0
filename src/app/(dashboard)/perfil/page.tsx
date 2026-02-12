'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { PLAN_LABELS, PLAN_COLORS, ALL_BADGES } from '@/lib/constants';
import { fetcher } from '@/lib/swr/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GamificationSummary } from '@/components/gamification/gamification-summary';
import { User as UserIcon, Sparkles, LogOut } from 'lucide-react';

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [niche, setNiche] = useState('');
  const [savedVars, setSavedVars] = useState({
    MEU_NOME: '',
    MEU_PRODUTO: '',
    MEU_PRECO: '',
    MINHA_EMPRESA: '',
  });
  const router = useRouter();
  const supabase = createClient();

  // Fetch badge data
  const { data: badgesRaw } = useSWR<
    Array<{ badge_type: string; earned_at: string }> | { badges: Array<{ badge_type: string; earned_at: string }> }
  >('/api/gamification/badges', fetcher);

  const badges = useMemo(() => {
    const earnedBadges: Array<{ badge_type: string; earned_at: string }> =
      badgesRaw
        ? Array.isArray(badgesRaw) ? badgesRaw : badgesRaw.badges ?? []
        : [];
    const earnedSet = new Set(earnedBadges.map((b) => b.badge_type));
    return ALL_BADGES.map((b) => ({
      type: b.type,
      name: b.name,
      earned: earnedSet.has(b.type),
    }));
  }, [badgesRaw]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setFullName(data.full_name);
        setNiche(data.niche || '');
        setSavedVars({
          MEU_NOME: data.saved_variables?.MEU_NOME || '',
          MEU_PRODUTO: data.saved_variables?.MEU_PRODUTO || '',
          MEU_PRECO: data.saved_variables?.MEU_PRECO || '',
          MINHA_EMPRESA: data.saved_variables?.MINHA_EMPRESA || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        niche,
        saved_variables: savedVars,
      })
      .eq('id', profile.id);
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[#0A0F1E] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      {/* Plan & User Info Card */}
      <Card className="bg-[#0A0F1E] border-[#131B35]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#131B35] flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-[#1D4ED8]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{profile.full_name || profile.email}</p>
                <p className="text-sm text-gray-400">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile.ai_credits_monthly !== 0 && (
                <div className="flex items-center gap-1 rounded-full bg-[#131B35] px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-purple-300">
                    {profile.ai_credits_monthly === -1 ? '∞' : profile.ai_credits_remaining} IA
                  </span>
                </div>
              )}
              <Badge
                style={{ backgroundColor: PLAN_COLORS[profile.plan] }}
                className="text-white font-semibold"
              >
                {PLAN_LABELS[profile.plan]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gamification Summary Card */}
      <Card className="bg-[#0A0F1E] border-[#131B35]">
        <CardContent className="pt-6">
          <GamificationSummary
            xp={profile.xp_points ?? 0}
            level={profile.level ?? 'iniciante'}
            currentStreak={profile.current_streak ?? 0}
            longestStreak={profile.longest_streak ?? 0}
            badges={badges}
          />
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="bg-[#0A0F1E] border-[#131B35]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400">Nome completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-[#131B35] border-[#1E2A52] text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Nicho de atuação</Label>
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex: Saúde, Educação, Tecnologia..."
              className="bg-[#131B35] border-[#1E2A52] text-white mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Saved Variables */}
      <Card className="bg-[#0A0F1E] border-[#131B35]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Variáveis Salvas</CardTitle>
          <p className="text-sm text-gray-400">
            Essas variáveis preenchem automaticamente os scripts
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(savedVars).map(([key, value]) => (
            <div key={key}>
              <Label className="text-gray-400">{`{{${key}}}`}</Label>
              <Input
                value={value}
                onChange={(e) => setSavedVars((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={key === 'MEU_PRECO' ? 'Ex: R$ 497,00' : `Seu ${key.toLowerCase().replace('meu_', '').replace('minha_', '')}`}
                className="bg-[#131B35] border-[#1E2A52] text-white mt-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="border-[#131B35] text-gray-400 hover:text-white hover:bg-[#131B35]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Referral Code */}
      {profile.referral_code && (
        <Card className="bg-[#0A0F1E] border-[#131B35]">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-400 mb-2">Seu código de indicação</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#131B35] p-3 rounded-lg text-[#1D4ED8] font-mono text-lg">
                {profile.referral_code}
              </code>
              <Button
                variant="outline"
                className="border-[#131B35] text-white hover:bg-[#131B35]"
                onClick={() => navigator.clipboard.writeText(
                  `${window.location.origin}?ref=${profile.referral_code}`
                )}
              >
                Copiar Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
