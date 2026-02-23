"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Search,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleToggles } from "@/hooks/use-module-toggles";
import type { Role, ModuleToggles } from "@/types/database";

interface SidebarProps {
  role?: Role;
  userName?: string;
  userAvatar?: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: keyof ModuleToggles;
}

const navItems: NavItem[] = [
  {
    label: "Gestão",
    href: "/",
    icon: LayoutDashboard,
    moduleKey: "gestao",
  },
  {
    label: "Scripts",
    href: "/trilhas",
    icon: Route,
    moduleKey: "scripts",
  },
  {
    label: "Personalizados",
    href: "/personalizados",
    icon: Sparkles,
    moduleKey: "personalizados",
  },
  {
    label: "Buscar",
    href: "/busca",
    icon: Search,
    moduleKey: "buscar",
  },
];

function SidebarNav({
  role,
  pathname,
  onNavigate,
  toggles,
}: {
  role?: Role;
  pathname: string;
  onNavigate?: () => void;
  toggles: ModuleToggles;
}) {
  const filteredNavItems = navItems.filter((item) => toggles[item.moduleKey]);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Image
          src="/logo.png"
          alt="Script Go"
          width={36}
          height={36}
          className="rounded-lg"
          priority
        />
        <span className="text-lg font-heading font-bold text-white">
          Script Go
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {filteredNavItems.map((item) => {
          const isActive =
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" &&
              (pathname === item.href ||
                pathname.startsWith(`${item.href}/`)));

          return (
            <Link
              key={item.href}
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
    </>
  );
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { toggles } = useModuleToggles();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[#131B35]/50 bg-[#0A0F1E] lg:flex">
      <SidebarNav
        role={role}
        pathname={pathname}
        toggles={toggles}
      />
    </aside>
  );
}

/** Mobile drawer sidebar — visible only on mobile via hamburger.
 *  Uses createPortal to render overlay+drawer at document.body level,
 *  escaping the header's stacking context (sticky + backdrop-blur
 *  create a z-30 context that would trap z-[70]/z-[80] below the
 *  bottom nav at z-50).
 */
export function MobileSidebar({
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toggles } = useModuleToggles();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawerContent = (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/70 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[110] flex w-72 flex-col border-r border-[#131B35]/50 bg-[#0A0F1E] transition-transform duration-200 ease-in-out lg:hidden",
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
          role={role}
          pathname={pathname}
          onNavigate={() => setOpen(false)}
          toggles={toggles}
        />
      </aside>
    </>
  );

  return (
    <>
      {/* Hamburger button (stays in header) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#131B35] hover:text-white lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portal overlay+drawer to body, escaping header stacking context */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
