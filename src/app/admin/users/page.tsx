'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  KeyRound,
  Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Plan } from '@/types/database';

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-700 text-gray-300',
  pro: 'bg-blue-900/50 text-blue-400',
  premium: 'bg-purple-900/50 text-purple-400',
  copilot: 'bg-amber-900/50 text-amber-400',
};

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (planFilter !== 'all') {
        query = query.eq('plan', planFilter);
      }

      if (search.trim()) {
        query = query.or(
          `email.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`
        );
      }

      const { data, count } = await query;
      setUsers(data ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, search, supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handleUpgrade(userId: string, newPlan: Plan) {
    setActionLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ plan: newPlan, updated_at: new Date().toISOString() })
        .eq('id', userId);

      await fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, plan: newPlan } : null));
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setActionLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);

      await fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, is_active: !isActive } : null
        );
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(userId: string) {
    setActionLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          password_changed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, password_changed: false } : null
        );
      }
      alert('Senha resetada. O usuário precisará trocar na próxima vez que entrar.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Usuários</h1>

      {/* Filters */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="border-[#1A3050] bg-[#1A3050] pl-10 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="w-40">
            <Select
              value={planFilter}
              onValueChange={(val) => {
                setPlanFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="border-[#1A3050] bg-[#1A3050] text-white">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="border-[#1A3050] bg-[#0F1D32] text-white">
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="copilot">Copilot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-[#1A3050] bg-[#0F1D32]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A3050] text-left text-gray-400">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3 text-right">XP</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Último login</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer border-b border-[#1A3050]/50 text-white transition-colors hover:bg-[#1A3050]/50"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="px-4 py-3 font-medium">{user.email}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {user.full_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={PLAN_COLORS[user.plan] || ''}>
                          {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{user.xp_points}</td>
                      <td className="px-4 py-3 capitalize text-gray-300">
                        {user.level}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString(
                              'pt-BR',
                              {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            user.is_active ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-500"
                      >
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#1A3050] px-4 py-3">
              <p className="text-sm text-gray-400">
                Mostrando {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#1A3050] bg-[#0F1D32] text-white">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-[#C9A84C]" />
                  Detalhes do Usuário
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Nome</p>
                    <p className="font-medium">
                      {selectedUser.full_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Plano</p>
                    <Badge className={PLAN_COLORS[selectedUser.plan] || ''}>
                      {selectedUser.plan.charAt(0).toUpperCase() +
                        selectedUser.plan.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p
                      className={
                        selectedUser.is_active
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">XP</p>
                    <p className="font-medium">{selectedUser.xp_points}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Level</p>
                    <p className="font-medium capitalize">{selectedUser.level}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Nicho</p>
                    <p className="font-medium">{selectedUser.niche || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tom Preferido</p>
                    <p className="font-medium capitalize">
                      {selectedUser.preferred_tone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Créditos IA</p>
                    <p className="font-medium">
                      {selectedUser.ai_credits_remaining}/
                      {selectedUser.ai_credits_monthly}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Streak</p>
                    <p className="font-medium">
                      {selectedUser.current_streak} dias (max:{' '}
                      {selectedUser.longest_streak})
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Código Referral</p>
                    <p className="font-mono text-xs">
                      {selectedUser.referral_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Origem Webhook</p>
                    <p className="font-medium">
                      {selectedUser.webhook_source || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Criado em</p>
                    <p className="font-medium">
                      {new Date(selectedUser.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Último login</p>
                    <p className="font-medium">
                      {selectedUser.last_login_at
                        ? new Date(selectedUser.last_login_at).toLocaleString(
                            'pt-BR'
                          )
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 border-t border-[#1A3050] pt-4">
                  <p className="text-sm font-medium text-gray-400">Ações</p>

                  {/* Plan upgrade/downgrade */}
                  <div className="flex flex-wrap gap-2">
                    {(['starter', 'pro', 'premium', 'copilot'] as Plan[]).map(
                      (plan) => (
                        <Button
                          key={plan}
                          size="sm"
                          variant={
                            selectedUser.plan === plan ? 'default' : 'outline'
                          }
                          disabled={
                            selectedUser.plan === plan || actionLoading
                          }
                          onClick={() =>
                            handleUpgrade(selectedUser.id, plan)
                          }
                          className={
                            selectedUser.plan === plan
                              ? 'bg-[#C9A84C] text-white hover:bg-[#C9A84C]/90'
                              : 'border-[#1A3050] text-gray-300 hover:bg-[#1A3050]'
                          }
                        >
                          {plan === selectedUser.plan ? (
                            plan.charAt(0).toUpperCase() + plan.slice(1)
                          ) : (
                            <>
                              {['starter', 'pro', 'premium', 'copilot'].indexOf(plan) >
                              ['starter', 'pro', 'premium', 'copilot'].indexOf(
                                selectedUser.plan
                              ) ? (
                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                              )}
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </>
                          )}
                        </Button>
                      )
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#1A3050] text-gray-300 hover:bg-[#1A3050]"
                      disabled={actionLoading}
                      onClick={() => handleResetPassword(selectedUser.id)}
                    >
                      <KeyRound className="mr-1 h-3 w-3" />
                      Resetar Senha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        selectedUser.is_active
                          ? 'border-red-800 text-red-400 hover:bg-red-900/30'
                          : 'border-green-800 text-green-400 hover:bg-green-900/30'
                      }
                      disabled={actionLoading}
                      onClick={() =>
                        handleToggleActive(
                          selectedUser.id,
                          selectedUser.is_active
                        )
                      }
                    >
                      <Power className="mr-1 h-3 w-3" />
                      {selectedUser.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
