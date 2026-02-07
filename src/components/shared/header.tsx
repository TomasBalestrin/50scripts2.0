"use client";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Bell, Settings, User, Shield, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/shared/plan-badge";
import type { Plan, Role } from "@/types/database";

interface HeaderProps {
  userName?: string;
  userAvatar?: string | null;
  plan: Plan;
  role?: Role;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trilhas": "Trilhas",
  "/buscar": "Buscar Scripts",
  "/agenda": "Agenda de Vendas",
  "/pipeline": "Pipeline",
  "/ia-generator": "IA Generator",
  "/colecoes": "Colecoes",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configuracoes",
  "/admin": "Admin",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check prefix matches for nested routes
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(`${path}/`)) {
      return title;
    }
  }

  return "50 Scripts";
}

export function Header({ userName, userAvatar, plan, role }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="flex items-center justify-between border-b border-[#252542]/50 bg-[#0F0F1A]/80 px-6 py-4 backdrop-blur-sm">
      {/* Left: Page title */}
      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#252542] hover:text-white"
          aria-label="Notificacoes"
        >
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E94560]" />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[#252542]"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar || undefined} alt={userName || "User"} />
                <AvatarFallback className="bg-[#0F3460] text-xs font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <PlanBadge plan={plan} className="hidden sm:inline-flex" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-[#252542] bg-[#1A1A2E] text-white"
          >
            <DropdownMenuItem
              className="cursor-pointer text-[#94A3B8] focus:bg-[#252542] focus:text-white"
              onClick={() => router.push("/perfil")}
            >
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-[#94A3B8] focus:bg-[#252542] focus:text-white"
              onClick={() => router.push("/configuracoes")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuracoes
            </DropdownMenuItem>
            {role === "admin" && (
              <DropdownMenuItem
                className="cursor-pointer text-[#94A3B8] focus:bg-[#252542] focus:text-white"
                onClick={() => router.push("/admin")}
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#252542]" />
            <DropdownMenuItem
              className="cursor-pointer text-[#E94560] focus:bg-[#252542] focus:text-[#E94560]"
              onClick={async () => {
                const supabase = createBrowserClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                await supabase.auth.signOut();
                router.push("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
