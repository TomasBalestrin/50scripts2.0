"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Search,
  Calendar,
  Kanban,
  Sparkles,
  FolderHeart,
  User,
  Brain,
  Bot,
  Trophy,
  History,
  ShieldCheck,
  Rocket,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAccess } from "@/lib/plans/gate";
import type { Plan, Role } from "@/types/database";

interface SidebarProps {
  plan: Plan;
  role?: Role;
  userName?: string;
  userAvatar?: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPlan?: Plan;
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: "Scripts",
    href: "/trilhas",
    icon: Route,
  },
  {
    label: "Progresso",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Subir de Nível",
    href: "/upgrade",
    icon: Rocket,
  },
  {
    label: "Buscar",
    href: "/busca",
    icon: Search,
  },
  {
    label: "Histórico",
    href: "/historico",
    icon: History,
  },
  {
    label: "Gamificação",
    href: "/badges",
    icon: Trophy,
    requiredPlan: "pro",
    section: "Plus",
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    requiredPlan: "pro",
  },
  {
    label: "IA Generator",
    href: "/ai-generator",
    icon: Sparkles,
    requiredPlan: "pro",
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: Kanban,
    requiredPlan: "premium",
    section: "Pro",
  },
  {
    label: "Coleções",
    href: "/colecoes",
    icon: FolderHeart,
    requiredPlan: "premium",
  },
  {
    label: "IA Copilot",
    href: "/ai-copilot",
    icon: Bot,
    requiredPlan: "copilot",
    section: "Premium",
  },
  {
    label: "Agenda Smart",
    href: "/agenda/smart",
    icon: Brain,
    requiredPlan: "copilot",
  },
];

function SidebarNav({
  plan,
  role,
  userName,
  userAvatar,
  pathname,
  onNavigate,
}: {
  plan: Plan;
  role?: Role;
  userName?: string;
  userAvatar?: string | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  // Filter items by plan access — only show what user can access
  const accessibleItems = navItems.filter(
    (item) => !item.requiredPlan || hasAccess(plan, item.requiredPlan)
  );

  let lastSection: string | undefined;

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Image
          src="/logo.png"
          alt="50 Scripts"
          width={36}
          height={36}
          className="rounded-lg"
          priority
        />
        <span className="text-lg font-heading font-bold text-white">
          50 Scripts
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {accessibleItems.map((item) => {
          const isActive =
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" &&
              (pathname === item.href ||
                pathname.startsWith(`${item.href}/`)));

          // Section divider
          let sectionHeader = null;
          if (item.section && item.section !== lastSection) {
            lastSection = item.section;
            sectionHeader = (
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {item.section}
                </span>
              </div>
            );
          }

          return (
            <div key={item.href}>
              {sectionHeader}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-l-2 border-[#3B82F6] bg-[#131B35] text-white"
                    : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#131B35]/50 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-[#1D4ED8]"
                      : "text-[#94A3B8] group-hover:text-white"
                  )}
                />
                <span className="flex-1">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Admin Link */}
      {role === "admin" && (
        <>
          <div className="mx-4 border-t border-[#131B35]" />
          <div className="p-3">
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "border-l-2 border-[#3B82F6] bg-[#131B35] text-white"
                  : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#131B35]/50 hover:text-white"
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  pathname.startsWith("/admin")
                    ? "text-[#1D4ED8]"
                    : "text-[#94A3B8]"
                )}
              />
              <span>Admin</span>
            </Link>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="mx-4 border-t border-[#131B35]" />

      {/* Profile link */}
      <div className="p-3">
        <Link
          href="/perfil"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === "/perfil"
              ? "border-l-2 border-[#3B82F6] bg-[#131B35] text-white"
              : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#131B35]/50 hover:text-white"
          )}
        >
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName || "Avatar"}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-bold text-white">
              {userName?.charAt(0)?.toUpperCase() || (
                <User className="h-4 w-4" />
              )}
            </div>
          )}
          <span className="truncate">{userName || "Meu Perfil"}</span>
        </Link>
      </div>
    </>
  );
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar({ plan, role, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[#131B35]/50 bg-[#0A0F1E] lg:flex">
      <SidebarNav
        plan={plan}
        role={role}
        userName={userName}
        userAvatar={userAvatar}
        pathname={pathname}
      />
    </aside>
  );
}

/** Mobile drawer sidebar — visible only on mobile via hamburger */
export function MobileSidebar({
  plan,
  role,
  userName,
  userAvatar,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#131B35] hover:text-white lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#131B35]/50 bg-[#0A0F1E] transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-[#131B35] hover:text-white"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarNav
          plan={plan}
          role={role}
          userName={userName}
          userAvatar={userAvatar}
          pathname={pathname}
          onNavigate={() => setOpen(false)}
        />
      </aside>
    </>
  );
}
