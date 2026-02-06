"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: BottomNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trilhas", href: "/trilhas", icon: Route },
  // Center slot left empty for FAB overlay
  { label: "Buscar", href: "/buscar", icon: Search },
  { label: "Perfil", href: "/perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#252542]/50 bg-[#1A1A2E]/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Fragment key={item.href}>
              {/* Insert empty center slot before the third item (index 2) */}
              {index === 2 && (
                <div className="w-14 flex-shrink-0" />
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                  isActive
                    ? "text-[#E94560]"
                    : "text-[#94A3B8] active:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-[#E94560]" : "text-[#94A3B8]"
                  )}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
