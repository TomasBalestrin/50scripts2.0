'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Shield,
  Palette,
  Bell,
  Save,
  LogOut,
  Loader2,
  Crown,
  Flame,
  Star,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LevelProgress } from '@/components/gamification/level-progress';
import { PLAN_LABELS, PLAN_COLORS, ALL_BADGES } from '@/lib/constants';
import type { Profile, Tone, NewLevel } from '@/types/database';

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: 'casual', label: 'Casual', desc: 'Tom informal e próximo' },
  { value: 'formal', label: 'Formal', desc: 'Tom profissional e sério' },
  { value: 'direct', label: 'Direto', desc: 'Tom objetivo e sucinto' },
];

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState('');
  const [niche, setNiche] = useState('');
  const [tone, setTone] = useState<Tone>('casual');
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    streak_risk: true,
    daily_challenge: true,
    weekly_digest: true,
  });
  const [badges, setBadges] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data: Profile = await res.json();
        setProfile(data);
        setFullName(data.full_name || '');
        setNiche(data.niche || '');
        setTone(data.preferred_tone || 'casual');
        setNotifPrefs(
          (data.notification_prefs as Record<string, boolean>) || {
            streak_risk: true,
            daily_challenge: true,
            weekly_digest: true,
          }
        );
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/missions');
      if (res.ok) {
        const data = await res.json();
        if (data.badges) setBadges(data.badges.map((b: { badge_type: string }) => b.badge_type));
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchBadges();
  }, [fetchProfile, fetchBadges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          niche,
          preferred_tone: tone,
          notification_prefs: notifPrefs,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 text-center text-[#94A3B8]">
        Erro ao carregar perfil
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
        <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>

        {/* Plan card */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${PLAN_COLORS[profile.plan]}20` }}
            >
              <Crown className="h-6 w-6" style={{ color: PLAN_COLORS[profile.plan] }} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#94A3B8]">Plano Atual</p>
              <p className="text-lg font-bold text-white">{PLAN_LABELS[profile.plan]}</p>
            </div>
            {profile.plan !== 'copilot' && (
              <Button
                size="sm"
                className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white text-xs"
                onClick={() => (window.location.href = '/upgrade')}
              >
                Upgrade
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Level */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="p-5">
            <LevelProgress
              level={profile.new_level as NewLevel}
              activeDays={profile.active_days}
            />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Flame className="mb-1 h-5 w-5 text-[#F59E0B]" />
              <p className="text-xl font-bold text-white">{profile.current_streak}</p>
              <p className="text-[10px] text-[#94A3B8]">Streak</p>
            </CardContent>
          </Card>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Star className="mb-1 h-5 w-5 text-[#8B5CF6]" />
              <p className="text-xl font-bold text-white">{profile.xp_points}</p>
              <p className="text-[10px] text-[#94A3B8]">XP Total</p>
            </CardContent>
          </Card>
          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardContent className="flex flex-col items-center p-4">
              <Calendar className="mb-1 h-5 w-5 text-[#10B981]" />
              <p className="text-xl font-bold text-white">{profile.active_days}</p>
              <p className="text-[10px] text-[#94A3B8]">Dias ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Conquistas</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {ALL_BADGES.map((badge) => {
                const earned = badges.includes(badge.type);
                return (
                  <div
                    key={badge.type}
                    className={`flex flex-col items-center gap-1 rounded-lg p-3 text-center ${
                      earned
                        ? 'border border-[#1D4ED8]/30 bg-[#1D4ED8]/10'
                        : 'border border-[#131B35] bg-[#020617] opacity-40'
                    }`}
                  >
                    <span className="text-lg">{earned ? '🏆' : '🔒'}</span>
                    <p className="text-[10px] font-medium text-white">
                      {badge.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="space-y-5 p-5">
            <h2 className="text-sm font-semibold text-white">Informações</h2>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Nome
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-[#020617] border-[#131B35] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                value={profile.email}
                disabled
                className="bg-[#020617] border-[#131B35] text-[#64748B]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Nicho
              </Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Saúde, Marketing, etc."
                className="bg-[#020617] border-[#131B35] text-white placeholder:text-[#64748B]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" /> Tom de Voz Preferido
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      tone === opt.value
                        ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-white'
                        : 'border-[#131B35] bg-[#020617] text-[#94A3B8] hover:border-[#1D4ED8]/30'
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="mt-0.5 text-[10px]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardContent className="space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Bell className="h-4 w-4" /> Notificações
            </h2>
            {[
              { key: 'streak_risk', label: 'Streak em risco' },
              { key: 'daily_challenge', label: 'Desafio diário' },
              { key: 'weekly_digest', label: 'Resumo semanal' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-[#CBD5E1]">{item.label}</span>
                <Switch
                  checked={notifPrefs[item.key] ?? true}
                  onCheckedChange={(val) =>
                    setNotifPrefs((prev) => ({ ...prev, [item.key]: val }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save + Logout */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white font-semibold"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              'Salvo!'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
