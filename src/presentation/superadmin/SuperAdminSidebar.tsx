"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Grid2x2,
  LogOut,
  Puzzle,
  Settings,
  Shield,
  Timer,
  Users,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/super-admin", label: "Overview", icon: Grid2x2 },
  { href: "/super-admin/clinicas", label: "Clinicas", icon: Building2 },
  { href: "/super-admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/super-admin/roles", label: "Roles y Permisos", icon: Shield },
  { href: "/super-admin/modulos", label: "Acceso a Modulos", icon: Puzzle },
  { href: "/super-admin/trials", label: "Trials", icon: Timer },
  { href: "/super-admin/recursos", label: "Recursos", icon: BookOpen },
];

type MeResponse = {
  ok: boolean;
  profileName?: string | null;
  session?: { isSuperAdmin?: boolean } | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const [name, setName] = useState("Super Admin");

  useEffect(() => {
    const loadMe = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const data = (await response.json().catch(() => null)) as MeResponse | null;
        if (!response.ok || !data?.ok) return;
        if (typeof data.profileName === "string" && data.profileName.trim().length > 0) {
          setName(data.profileName.trim());
        }
      } catch {
        // Keep fallback name.
      }
    };

    void loadMe();
  }, []);

  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-[#122c55] bg-[#071a34] px-3 py-3 text-white">
      <div className="flex items-center gap-2 px-1.5 pb-3">
        <img src="/images/branding/Zensya.png" alt="Zensya" className="h-4 w-auto object-contain" />
        <span className="rounded-full bg-[#d8f6ff] px-2 py-0.5 text-[11px] font-semibold text-[#0b3a54]">
          Admin
        </span>
      </div>

      <div className="border-t border-[#12315d] pt-4">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5a759d]">Plataforma</p>
        <nav className="mt-3 space-y-1">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  active ? "bg-[#153d72] text-white" : "text-[#a8bfdc] hover:bg-[#0f2c54] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-1 border-t border-[#12315d] pt-3">
        <Link
          href="/super-admin/configuracion"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[#a8bfdc] transition hover:bg-[#0f2c54] hover:text-white"
        >
          <Settings className="h-4 w-4" strokeWidth={2} />
          <span>Configuracion</span>
        </Link>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[#a8bfdc] transition hover:bg-[#0f2c54] hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            <span>Cerrar sesion</span>
          </button>
        </form>

        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b86b8] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-xs text-[#7ea1c8]">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
