'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  KeyRound,
  Power,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', full_name: '', plan: 'starter' });
  const [addError, setAddError] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [editError, setEditError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete confirm modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Action toast
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function showToast(type: 'success' | 'error', text: string) {
    setActionToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setActionToast(null), 4000);
  }

  const [syncLoading, setSyncLoading] = useState(false);

  const [fetchError, setFetchError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input (400ms)
  useEffect(() => {
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(PAGE_SIZE),
      });
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users ?? []);
        setTotalCount(data.total ?? 0);
      } else {
        console.error('API error:', data);
        setFetchError(data.error || 'Erro ao buscar usuários');
        setUsers([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setFetchError('Erro de conexão ao buscar usuários');
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handleSync() {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        if (data.synced > 0) {
          showToast('success', `${data.synced} perfil(is) sincronizado(s)`);
          await fetchUsers();
        } else {
          showToast('success', 'Todos os usuários já possuem perfil');
        }
      } else {
        showToast('error', data.error || 'Erro ao sincronizar');
      }
    } catch {
      showToast('error', 'Erro de conexão ao sincronizar');
    } finally {
      setSyncLoading(false);
    }
  }

  // --- Actions ---

  async function handleUpgrade(userId: string, newPlan: Plan) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, plan: newPlan }),
      });

      if (res.ok) {
        // Update local state immediately
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan: newPlan } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, plan: newPlan } : null));
        }
        showToast('success', `Plano alterado para ${newPlan}`);
      } else {
        showToast('error', 'Erro ao alterar plano');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !isActive }),
      });

      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !isActive } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) => prev ? { ...prev, is_active: !isActive } : null);
        }
        showToast('success', isActive ? 'Usuário desativado' : 'Usuário ativado');
      } else {
        showToast('error', 'Erro ao alterar status');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(userId: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        showToast('error', data.error || 'Erro ao resetar senha');
        return;
      }

      showToast('success', 'Senha resetada para a padrão.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddUser() {
    setAddError('');
    if (!addForm.email || !addForm.password) {
      setAddError('Email e senha são obrigatórios');
      return;
    }
    if (addForm.password.length < 6) {
      setAddError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Erro ao criar usuário');
        return;
      }

      setShowAddModal(false);
      setAddForm({ email: '', password: '', full_name: '', plan: 'starter' });
      await fetchUsers();
    } finally {
      setActionLoading(false);
    }
  }

  function openEditModal(user: Profile) {
    setEditUser(user);
    setEditForm({ email: user.email, password: '' });
    setEditError('');
    setShowEditPassword(false);
    setShowEditModal(true);
  }

  async function handleEditUser() {
    if (!editUser) return;
    setEditError('');

    const payload: { email?: string; password?: string } = {};
    if (editForm.email && editForm.email !== editUser.email) {
      payload.email = editForm.email;
    }
    if (editForm.password) {
      if (editForm.password.length < 6) {
        setEditError('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      payload.password = editForm.password;
    }

    if (!payload.email && !payload.password) {
      setEditError('Nenhuma alteração detectada');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Erro ao editar usuário');
        return;
      }

      setShowEditModal(false);
      setEditUser(null);
      // Close detail modal too if open
      if (selectedUser?.id === editUser.id) {
        setSelectedUser(null);
      }
      await fetchUsers();
    } finally {
      setActionLoading(false);
    }
  }

  function openDeleteModal(user: Profile) {
    setDeleteUser(user);
    setDeleteError('');
    setShowDeleteModal(true);
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    setDeleteError('');
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Erro ao remover usuário');
        return;
      }

      setShowDeleteModal(false);
      setDeleteUser(null);
      if (selectedUser?.id === deleteUser.id) {
        setSelectedUser(null);
      }
      showToast('success', 'Usuário removido com sucesso');
      await fetchUsers();
    } catch {
      setDeleteError('Erro de rede ao remover usuário. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action toast */}
      {actionToast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg transition-all ${
          actionToast.type === 'success'
            ? 'bg-green-900/90 text-green-200 border border-green-700'
            : 'bg-red-900/90 text-red-200 border border-red-700'
        }`}>
          {actionToast.text}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSync}
            disabled={syncLoading}
            variant="outline"
            className="border-[#131B35] text-gray-300 hover:bg-[#131B35] hover:text-white"
          >
            {syncLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar
          </Button>
          <Button
            onClick={() => {
              setAddForm({ email: '', password: '', full_name: '', plan: 'starter' });
              setAddError('');
              setShowAddPassword(false);
              setShowAddModal(true);
            }}
            className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-[#131B35] bg-[#131B35] pl-10 text-white placeholder:text-gray-500"
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
              <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Plus</SelectItem>
                <SelectItem value="premium">Pro</SelectItem>
                <SelectItem value="copilot">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-[#131B35] bg-[#0A0F1E]">
        <CardContent className="p-0">
          {fetchError && (
            <div className="border-b border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              <p className="font-medium">Erro: {fetchError}</p>
              <p className="mt-1 text-xs text-red-500">
                Execute a migration 005_admin_rpc_functions.sql no Supabase SQL Editor ou configure SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.
              </p>
            </div>
          )}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#131B35] text-left text-gray-400">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3 text-right">XP</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3">Último login</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#131B35]/50 text-white transition-colors hover:bg-[#131B35]/50"
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            title="Ver detalhes"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-[#3B82F6]"
                            title="Editar email/senha"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                            title="Remover usuário"
                            onClick={() => openDeleteModal(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
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
            <div className="flex items-center justify-between border-t border-[#131B35] px-4 py-3">
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

      {/* ===== User Detail Modal ===== */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#131B35] bg-[#0A0F1E] text-white">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-[#1D4ED8]" />
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
                <div className="space-y-3 border-t border-[#131B35] pt-4">
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
                              ? 'bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90'
                              : 'border-[#131B35] text-gray-300 hover:bg-[#131B35]'
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

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#131B35] text-gray-300 hover:bg-[#131B35]"
                      disabled={actionLoading}
                      onClick={() => {
                        openEditModal(selectedUser);
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar Email/Senha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#131B35] text-gray-300 hover:bg-[#131B35]"
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-800 text-red-400 hover:bg-red-900/30"
                      disabled={actionLoading}
                      onClick={() => {
                        openDeleteModal(selectedUser);
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Add User Modal ===== */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="border-[#131B35] bg-[#0A0F1E] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5 text-[#1D4ED8]" />
              Adicionar Usuário
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Nome completo</Label>
              <Input
                placeholder="Nome do usuário"
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                className="border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email *</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Senha *</Label>
              <div className="relative">
                <Input
                  type={showAddPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="border-[#131B35] bg-[#131B35] pr-10 text-white placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Plano</Label>
              <Select
                value={addForm.plan}
                onValueChange={(val) => setAddForm({ ...addForm, plan: val })}
              >
                <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Plus</SelectItem>
                  <SelectItem value="premium">Pro</SelectItem>
                  <SelectItem value="copilot">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addError && (
              <p className="text-sm text-red-400">{addError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAddModal(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={actionLoading}
              className="bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit User Modal ===== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-[#131B35] bg-[#0A0F1E] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Pencil className="h-5 w-5 text-[#3B82F6]" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>

          {editUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-400">
                Editando: <span className="font-medium text-white">{editUser.full_name || editUser.email}</span>
              </p>

              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  placeholder="Novo email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="border-[#131B35] bg-[#131B35] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Deixe vazio para não alterar"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="border-[#131B35] bg-[#131B35] pr-10 text-white placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Deixe em branco para manter a senha atual</p>
              </div>

              {editError && (
                <p className="text-sm text-red-400">{editError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={actionLoading}
              className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation Modal ===== */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="border-[#131B35] bg-[#0A0F1E] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Remover Usuário
            </DialogTitle>
          </DialogHeader>

          {deleteUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-300">
                Tem certeza que deseja remover o usuário?
              </p>
              <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-3">
                <p className="font-medium text-white">{deleteUser.full_name || '-'}</p>
                <p className="text-sm text-gray-400">{deleteUser.email}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Plano: {deleteUser.plan.charAt(0).toUpperCase() + deleteUser.plan.slice(1)}
                </p>
              </div>
              <p className="text-xs text-red-400">
                Esta ação é irreversível. Todos os dados do usuário serão removidos permanentemente.
              </p>

              {deleteError && (
                <p className="text-sm text-red-400">{deleteError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
