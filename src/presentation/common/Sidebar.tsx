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
  ClipboardList,
  Bell,
  ChevronsUpDown,
  LogOut,
  Pencil,
  UserCircle,
  MessageCircle,
  Activity,
  Building2,
  UserCog,
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
    matchPrefixes: ["/crm", "/chat-meta", "/leads"],
  },
  {
    href: "/patients",
    label: "Historial paciente",
    icon: Users,
    group: "paginas",
    permission: "PATIENTS",
  },
  { href: "/seguimiento", label: "Seguimiento", icon: Activity, group: "paginas", permission: "SEGUIMIENTO" },
  {
    href: "/clinical-visits",
    label: "Cita clinica",
    icon: ClipboardList,
    group: "paginas",
    permission: "CLINICAL_VISITS",
    doctorOnlyWithPermission: true,
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
  {
    href: "/gestion-usuarios",
    label: "Gestionar usuarios",
    icon: UserCog,
    group: "paginas",
    roles: ["ADMIN"],
  },
];

export default function Sidebar() {
  const { state, actions } = useSidebarViewModel();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (state.role === null) return false;

    if (item.href === "/gestion-usuarios") {
      return state.role === "ADMIN" && state.isSuperAdmin;
    }

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

  const isItemActive = (item: NavItem) => {
    const matchPrefixes = item.matchPrefixes ?? [item.href];
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  const renderItem = (item: NavItem, nested = false) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex rounded-xl text-[13px] font-medium leading-4 transition-colors ${
          collapsed
            ? "justify-center px-0 py-2.5"
            : nested
              ? "items-start gap-2.5 px-2.5 py-2.5 pl-10"
              : "items-start gap-2.5 px-2.5 py-2.5"
        } ${
          active ? "bg-white text-[#19b3bc]" : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon
          className={`mt-0.5 h-[17px] w-[17px] shrink-0 ${active ? "text-[#19b3bc]" : "text-white/90"}`}
          strokeWidth={2}
        />
        {!collapsed && (
          <span className="min-w-0 flex-1 whitespace-normal break-words text-[13px] leading-4">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`sidebar-scrollbar flex h-screen shrink-0 flex-col overflow-y-auto border-r border-[#0f8f98] bg-[#19b3bc] px-2.5 py-3.5 transition-[width] duration-300 ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      <div className={`flex items-center px-1 ${collapsed ? "justify-center" : "gap-2.5"}`}>
        {!collapsed && (
          <>
            <Link
              href="/profile"
              className="group/profile relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#19b3bc]"
              aria-label="Editar mi perfil"
              title="Editar mi perfil"
            >
              {state.image ? (
                <img
                  src={state.image}
                  alt={state.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white text-sm font-semibold text-[#19b3bc]">
                  {state.initials}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-white opacity-0 transition-opacity group-hover/profile:opacity-100 group-focus-visible/profile:opacity-100">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-4 text-white">{state.displayName}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-white/80">{state.clinicLabel}</p>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#19b3bc]"
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
        >
          <span className="relative flex h-4 w-4 flex-col items-center justify-center">
            <span
              className={`absolute h-[2px] w-4 rounded-full bg-white transition-all duration-200 ${
                collapsed ? "-translate-y-1.5" : "-translate-y-1"
              }`}
            />
            <span className="absolute h-[2px] w-4 rounded-full bg-white transition-all duration-200" />
            <span
              className={`absolute h-[2px] w-4 rounded-full bg-white transition-all duration-200 ${
                collapsed ? "translate-y-1.5" : "translate-y-1"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="mt-6">
        {!collapsed && (
          <p className="px-1 text-[9px] font-medium uppercase tracking-[0.16em] text-white/65">Escritorios</p>
        )}
        <nav className="mt-2 flex flex-col gap-1">{escritorioItems.map((item) => renderItem(item))}</nav>
      </div>

      <div className="mt-4">
        {!collapsed && <p className="px-1 text-[9px] font-medium uppercase tracking-[0.16em] text-white/65">Paginas</p>}
        <nav className="mt-2 flex flex-col gap-1">{paginaItems.map((item) => renderItem(item))}</nav>
      </div>

      <div className="mt-auto space-y-1 pt-4">
        <Link
          href="/clinic-dashboard"
          className={`flex rounded-xl text-[13px] font-medium leading-4 transition-colors ${
            collapsed ? "justify-center px-0 py-2.5" : "items-start gap-2.5 px-2.5 py-2.5"
          } ${
            pathname === "/clinic-dashboard" || pathname.startsWith("/clinic-dashboard/")
              ? "bg-white text-[#19b3bc]"
              : "text-white/90 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Building2 className="mt-0.5 h-[17px] w-[17px] shrink-0" strokeWidth={2} />
          {!collapsed && (
            <span className="min-w-0 flex-1 whitespace-normal break-words text-[13px] leading-4">
              Mi Clinica
            </span>
          )}
        </Link>

        {!state.isSuperAdmin && (
          <button
            type="button"
            onClick={actions.handleChangeClinic}
            className={`flex w-full rounded-xl text-[13px] font-medium leading-4 text-white/90 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-0 py-2.5" : "items-start gap-2.5 px-2.5 py-2.5"
            }`}
          >
            <ChevronsUpDown className="mt-0.5 h-[17px] w-[17px] text-white/90" />
            {!collapsed && (
              <span className="min-w-0 flex-1 whitespace-normal break-words text-left text-[13px] leading-4">
                Cambiar sede
              </span>
            )}
          </button>
        )}

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className={`flex w-full rounded-xl text-[13px] font-medium leading-4 text-white/90 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-0 py-2.5" : "items-start gap-2.5 px-2.5 py-2.5"
            }`}
          >
            <LogOut className="mt-0.5 h-[17px] w-[17px] text-white/90" />
            {!collapsed && (
              <span className="min-w-0 flex-1 whitespace-normal break-words text-left text-[13px] leading-4">
                Cerrar sesion
              </span>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
