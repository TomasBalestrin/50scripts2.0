"use client";

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
  Lock,
  User,
  Brain,
  Bot,
  Trophy,
  History,
  ShieldCheck,
  Rocket,
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
    label: "Gamificação",
    href: "/badges",
    icon: Trophy,
    requiredPlan: "pro",
    section: "Pro",
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    requiredPlan: "pro",
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

export function Sidebar({ plan, role, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();

  let lastSection: string | undefined;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[#131B35]/50 bg-[#0A0F1E] lg:flex">
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
                    ? "border-l-2 border-[#3B82F6] bg-[#131B35] text-white"
                    : "border-l-2 border-transparent text-[#94A3B8] hover:bg-[#131B35]/50 hover:text-white",
                  isLocked && "cursor-not-allowed opacity-50"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-[#1D4ED8]" : "text-[#94A3B8] group-hover:text-white"
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
          <div className="mx-4 border-t border-[#131B35]" />
          <div className="p-3">
            <Link
              href="/admin"
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
              {userName?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
            </div>
          )}
          <span className="truncate">{userName || "Meu Perfil"}</span>
        </Link>
      </div>
    </aside>
  );
}
