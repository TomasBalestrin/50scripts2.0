'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Bot,
  Lightbulb,
  Webhook,
  Settings,
  FlaskConical,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/scripts', label: 'Scripts', icon: FileText },
  { href: '/admin/categories', label: 'Categorias', icon: FolderOpen },
  { href: '/admin/prompts', label: 'Prompts IA', icon: Bot },
  { href: '/admin/tips', label: 'Dicas', icon: Lightbulb },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/admin/experiments', label: 'Experimentos', icon: FlaskConical },
  { href: '/admin/config', label: 'Configurações', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[#252542] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E94560]">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">50 Scripts</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Painel Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-[#E94560]/10 text-[#E94560]'
                  : 'text-gray-400 hover:bg-[#252542] hover:text-white'
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-[#E94560]' : 'text-gray-500')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#252542] p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-[#252542] hover:text-white"
        >
          <LogOut className="h-5 w-5 text-gray-500" />
          Voltar ao App
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg bg-[#1A1A2E] p-2 text-white shadow-lg lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[#252542] bg-[#1A1A2E] transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-[#252542] bg-[#1A1A2E] lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
