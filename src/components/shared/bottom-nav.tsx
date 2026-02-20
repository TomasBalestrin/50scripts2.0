"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleToggles } from "@/hooks/use-module-toggles";
import type { ModuleToggles } from "@/types/database";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: keyof ModuleToggles;
}

const navItems: BottomNavItem[] = [
  { label: "Gestao", href: "/", icon: LayoutDashboard, moduleKey: "gestao" },
  { label: "Scripts", href: "/trilhas", icon: Route, moduleKey: "scripts" },
  { label: "Personalizados", href: "/personalizados", icon: Sparkles, moduleKey: "personalizados" },
  { label: "Buscar", href: "/busca", icon: Search, moduleKey: "buscar" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { toggles } = useModuleToggles();
  const filteredNavItems = navItems.filter((item) => toggles[item.moduleKey]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#131B35]/50 bg-[#0A0F1E]/95 backdrop-blur-md lg:hidden safe-area-bottom">
      <div className="mx-auto flex h-14 max-w-md items-center justify-around px-4">
        {filteredNavItems.map((item) => {
          const isActive =
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-1.5 transition-colors min-w-[3.5rem]",
                isActive
                  ? "text-[#1D4ED8]"
                  : "text-[#94A3B8] active:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-[#1D4ED8]" : "text-[#94A3B8]"
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
