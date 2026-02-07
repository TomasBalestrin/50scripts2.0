"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Search,
  Calendar,
  Kanban,
  Sparkles,
  FolderHeart,
  Lock,
  User,
  Brain,
  Bot,
  Trophy,
  Gift,
  History,
  ShieldCheck,
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
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Trilhas",
    href: "/trilhas",
    icon: Route,
  },
  {
    label: "Buscar",
    href: "/busca",
    icon: Search,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    requiredPlan: "pro",
  },
  {
    label: "Gamificação",
    href: "/badges",
    icon: Trophy,
    requiredPlan: "pro",
    section: "Pro",
  },
  {
    label: "Histórico",
    href: "/historico",
    icon: History,
    requiredPlan: "pro",
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: Kanban,
    requiredPlan: "premium",
    section: "Premium",
  },
  {
    label: "IA Generator",
    href: "/ai-generator",
    icon: Sparkles,
    requiredPlan: "premium",
  },
  {
    label: "Coleções",
    href: "/colecoes",
    icon: FolderHeart,
    requiredPlan: "premium",
  },
  {
    label: "Indicações",
    href: "/referrals",
    icon: Gift,
    requiredPlan: "premium",
  },
  {
    label: "IA Copilot",
    href: "/ai-copilot",
    icon: Bot,
    requiredPlan: "copilot",
    section: "Copilot",
  },
  {
    label: "Agenda Smart",
    href: "/agenda/smart",
    icon: Brain,
    requiredPlan: "copilot",
  },
];

export function Sidebar({ plan, role, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();

  let lastSection: string | undefined;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[#252542]/50 bg-[#1A1A2E] lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="text-xl font-bold">
          <span className="bg-gradient-to-r from-[#E94560] to-[#E94560]/70 bg-clip-text text-transparent">
            50 Scripts
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
          const isLocked =
            item.requiredPlan && !hasAccess(plan, item.requiredPlan);

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
                href={isLocked ? "#" : item.href}
                onClick={(e) => {
                  if (isLocked) e.preventDefault();
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-l-2 border-[#0F3460] bg-[#252542] text-white"
                    : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#252542]/50 hover:text-white",
                  isLocked && "cursor-not-allowed opacity-50"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-[#E94560]" : "text-[#94A3B8] group-hover:text-white"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isLocked && (
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[#94A3B8]" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Admin Link */}
      {role === "admin" && (
        <>
          <div className="mx-4 border-t border-[#252542]" />
          <div className="p-3">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "border-l-2 border-[#0F3460] bg-[#252542] text-white"
                  : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#252542]/50 hover:text-white"
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  pathname.startsWith("/admin")
                    ? "text-[#E94560]"
                    : "text-[#94A3B8]"
                )}
              />
              <span>Admin</span>
            </Link>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="mx-4 border-t border-[#252542]" />

      {/* Profile link */}
      <div className="p-3">
        <Link
          href="/perfil"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === "/perfil"
              ? "border-l-2 border-[#0F3460] bg-[#252542] text-white"
              : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#252542]/50 hover:text-white"
          )}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || "Avatar"}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F3460] text-xs font-bold text-white">
              {userName?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
            </div>
          )}
          <span className="truncate">{userName || "Meu Perfil"}</span>
        </Link>
      </div>
    </aside>
  );
}
