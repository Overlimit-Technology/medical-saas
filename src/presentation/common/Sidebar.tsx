"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  CalendarDays,
  KanbanSquare,
  Users,
  UserCog,
  Pill,
  DoorOpen,
  ClipboardList,
  Bell,
  ChevronsUpDown,
  LogOut,
  UserCircle,
  MessageCircle,
  Activity,
} from "lucide-react";
import { hasPermission, type UserPermission } from "@/lib/permissions";
import { useSidebarViewModel } from "./SidebarViewModel";

type Role = "ADMIN" | "SECRETARY" | "DOCTOR";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "escritorios" | "paginas";
  matchPrefixes?: string[];
  roles?: Role[];
  permission?: UserPermission;
  doctorOnlyWithPermission?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Vista General", icon: LayoutGrid, group: "escritorios" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, group: "escritorios", permission: "AGENDA" },
  {
    href: "/crm",
    label: "CRM",
    icon: KanbanSquare,
    group: "escritorios",
    permission: "LEADS",
    matchPrefixes: ["/crm", "/chat-meta"],
  },
  {
    href: "/patients",
    label: "Historial paciente",
    icon: Users,
    group: "paginas",
    permission: "PATIENTS",
  },
  {
    href: "/usuarios",
    label: "Usuario",
    icon: UserCog,
    group: "paginas",
    permission: "USERS",
    matchPrefixes: ["/usuarios", "/doctors"],
  },
  { href: "/treatments", label: "Tratamientos", icon: Pill, group: "paginas", permission: "TREATMENTS" },
  { href: "/seguimiento", label: "Seguimiento", icon: Activity, group: "paginas", permission: "SEGUIMIENTO" },
  { href: "/boxes", label: "Boxes", icon: DoorOpen, group: "paginas", permission: "BOXES" },
  {
    href: "/clinical-visits",
    label: "Cita clinica",
    icon: ClipboardList,
    group: "paginas",
    permission: "CLINICAL_VISITS",
    doctorOnlyWithPermission: true,
  },
  {
    href: "/form-templates",
    label: "Fichas Clínicas",
    icon: ClipboardList,
    group: "paginas",
    roles: ["ADMIN", "DOCTOR"],
  },
  {
    href: "/notifications",
    label: "Notificaciones",
    icon: Bell,
    group: "paginas",
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
  },
  {
    href: "/chat",
    label: "Mensajeria interna",
    icon: MessageCircle,
    group: "paginas",
    permission: "CHAT",
  },
  {
    href: "/profile",
    label: "Mi perfil",
    icon: UserCircle,
    group: "paginas",
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
  },
];

export default function Sidebar() {
  const { state, actions } = useSidebarViewModel();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (state.role === null) return false;

    if (item.doctorOnlyWithPermission) {
      return (
        state.role === "DOCTOR" &&
        hasPermission(state.role, state.permissions, "CLINICAL_VISITS", state.isSuperAdmin)
      );
    }

    if (item.permission) {
      return hasPermission(state.role, state.permissions, item.permission, state.isSuperAdmin);
    }

    if (!item.roles) return true;
    return item.roles.includes(state.role);
  });

  const escritorioItems = visibleItems.filter((item) => item.group === "escritorios");
  const paginaItems = visibleItems.filter((item) => item.group === "paginas");

  const renderItem = (item: NavItem) => {
    const matchPrefixes = item.matchPrefixes ?? [item.href];
    const active = matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
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
          className={`h-[18px] w-[18px] shrink-0 ${active ? "text-slate-900" : "text-slate-500"}`}
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
        {state.image ? (
          <img
            src={state.image}
            alt={state.displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {state.initials}
          </div>
        )}

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{state.displayName}</p>
            <p className="truncate text-xs text-slate-500">{state.clinicLabel}</p>
            {state.email ? <p className="truncate text-[11px] text-slate-400">{state.email}</p> : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <ChevronsUpDown
            className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <div className="mt-8">
        {!collapsed && <p className="px-2 text-xs font-medium text-slate-400">Escritorios</p>}
        <nav className="mt-2 flex flex-col gap-1">{escritorioItems.map(renderItem)}</nav>
      </div>

      <div className="mt-6">
        {!collapsed && <p className="px-2 text-xs font-medium text-slate-400">Páginas</p>}
        <nav className="mt-2 flex flex-col gap-1">{paginaItems.map(renderItem)}</nav>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <button
          type="button"
          onClick={actions.handleChangeClinic}
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
