"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  CalendarDays,
  Stethoscope,
  HandCoins,
  Users,
  UserCog,
  Pill,
  DoorOpen,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";

type Role = "ADMIN" | "SECRETARY" | "DOCTOR";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  group: "escritorios" | "paginas";
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Vista General",
    icon: LayoutGrid,
    group: "escritorios",
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: CalendarDays,
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
    group: "escritorios",
  },
  {
    href: "/clinical-visits",
    label: "Cita clínica",
    icon: Stethoscope,
    roles: ["DOCTOR"],
    group: "escritorios",
  },
  {
    href: "/crm",
    label: "Gestion de contactos y cobros",
    icon: HandCoins,
    roles: ["ADMIN", "SECRETARY"],
    group: "escritorios",
  },
  {
    href: "/patients",
    label: "Pacientes",
    icon: Users,
    roles: ["ADMIN", "SECRETARY"],
    group: "paginas",
  },
  {
    href: "/doctors",
    label: "Usuario",
    icon: UserCog,
    roles: ["ADMIN"],
    group: "paginas",
  },
  {
    href: "/treatments",
    label: "Tratamientos",
    icon: Pill,
    roles: ["ADMIN", "DOCTOR"],
    group: "paginas",
  },
  {
    href: "/boxes",
    label: "Boxes",
    icon: DoorOpen,
    roles: ["ADMIN"],
    group: "paginas",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.ok) {
          if (data.session?.role) setRole(data.session.role);
          if (data.profileName) setUserName(data.profileName);
          if (data.clinicName) setClinicName(data.clinicName);
        }
      } catch {
        setRole(null);
      }
    };

    loadMe();
  }, []);

  const handleChangeClinic = async () => {
    await fetch("/api/clinics/clear", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/select-clinic");
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (role === null) return false;
    return item.roles.includes(role);
  });

  const escritorioItems = visibleItems.filter((item) => item.group === "escritorios");
  const paginaItems = visibleItems.filter((item) => item.group === "paginas");

  const renderItem = (item: NavItem) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-slate-100 text-slate-900"
            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? "text-slate-900" : "text-slate-500"
          }`}
          strokeWidth={2}
        />
        {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-[#f8f8f8] px-4 py-5 transition-[width] duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
          {userName ? userName.charAt(0).toUpperCase() : "MG"}
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {userName ?? "Medigest"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {clinicName ?? "Panel clínico"}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <ChevronsUpDown
            className={`h-4 w-4 transition-transform duration-200 ${
              collapsed ? "rotate-90" : ""
            }`}
          />
        </button>
      </div>

      <div className="mt-8">
        {!collapsed && (
          <p className="px-2 text-xs font-medium text-slate-400">Escritorios</p>
        )}
        <nav className="mt-2 flex flex-col gap-1">{escritorioItems.map(renderItem)}</nav>
      </div>

      <div className="mt-6">
        {!collapsed && (
          <p className="px-2 text-xs font-medium text-slate-400">Páginas</p>
        )}
        <nav className="mt-2 flex flex-col gap-1">{paginaItems.map(renderItem)}</nav>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={handleChangeClinic}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronsUpDown className="h-[18px] w-[18px] text-slate-500" />
          {!collapsed && <span>Cambiar sede</span>}
        </button>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-[18px] w-[18px] text-slate-500" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}