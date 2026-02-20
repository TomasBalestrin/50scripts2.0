"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileSidebar } from "@/components/shared/sidebar";
import type { Role } from "@/types/database";

interface HeaderProps {
  userName?: string;
  userAvatar?: string | null;
  role?: Role;
}

const pageTitles: Record<string, string> = {
  "/": "Gestao",
  "/trilhas": "Scripts",
  "/personalizados": "Personalizados",
  "/busca": "Buscar",
  "/admin": "Admin",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== "/" && pathname.startsWith(`${path}/`)) {
      return title;
    }
  }

  // Script detail pages
  if (pathname.startsWith("/scripts/")) {
    return "Script";
  }

  return "Script Go";
}

export function Header({ userName, userAvatar, role }: HeaderProps) {
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#131B35]/50 bg-[#020617]/95 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
      {/* Left: Mobile menu + Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <MobileSidebar
          role={role}
          userName={userName}
          userAvatar={userAvatar}
        />
        <h1 className="truncate text-base font-semibold text-white sm:text-lg">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Avatar */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[#131B35]"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar || undefined} alt={userName || "User"} />
                <AvatarFallback className="bg-[#3B82F6] text-xs font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-[#131B35] bg-[#0A0F1E] text-white"
          >
            {role === "admin" && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer text-[#94A3B8] focus:bg-[#131B35] focus:text-white"
                  onClick={() => router.push("/admin")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#131B35]" />
              </>
            )}
            <DropdownMenuItem
              className="cursor-pointer text-[#1D4ED8] focus:bg-[#131B35] focus:text-[#1D4ED8]"
              onClick={async () => {
                const supabase = createClient();
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
