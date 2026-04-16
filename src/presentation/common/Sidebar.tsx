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
  UserCircle,
  MessageCircle,
  Activity,
  Building2,
  ChevronDown,
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

type NavGroupItem = {
  label: string;
  icon: LucideIcon;
  group: "escritorios" | "paginas";
  children: NavItem[];
  href?: string; // Optional: if provided, the group label becomes a link
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
];

const NAV_GROUPS: NavGroupItem[] = [];

export default function Sidebar() {
  const { state, actions } = useSidebarViewModel();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    children: group.children.filter((item) => {
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
    }),
  })).filter((group) => group.children.length > 0);

  const escritorioItems = visibleItems.filter((item) => item.group === "escritorios");
  const paginaItems = visibleItems.filter((item) => item.group === "paginas");

  const isItemActive = (item: NavItem) => {
    const matchPrefixes = item.matchPrefixes ?? [item.href];
    return matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  };

  const renderItem = (item: NavItem, nested = false) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center rounded-xl text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0 py-2.5" : nested ? "gap-3 px-3 py-2.5 pl-11" : "gap-3 px-3 py-2.5"
        } ${
          active
            ? "bg-white text-[#19b3bc]"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#19b3bc]" : "text-white/90"}`}
          strokeWidth={2}
        />
        {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
      </Link>
    );
  };

  const renderGroup = (group: NavGroupItem) => {
    const groupActive = group.children.some(isItemActive);
    const currentGroupActive = group.href ? pathname === group.href || pathname.startsWith(`${group.href}/`) : groupActive;
    const groupExpanded = !collapsed && (expandedGroups[group.label] ?? groupActive);
    const GroupIcon = group.icon;

    // Content part - Link if href, otherwise just a div
    const contentClasses = `flex items-center flex-1 rounded-xl text-sm font-medium transition-colors ${
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
    } ${
      currentGroupActive
        ? "bg-white text-[#19b3bc]"
        : "text-white/90 hover:bg-white/10 hover:text-white"
    }`;

    const contentContent = (
      <>
        <GroupIcon
          className={`h-[18px] w-[18px] shrink-0 ${currentGroupActive ? "text-[#19b3bc]" : "text-white/90"}`}
          strokeWidth={2}
        />
        {!collapsed && <span className="min-w-0 truncate text-left">{group.label}</span>}
      </>
    );

    return (
      <div key={group.label} className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          {group.href ? (
            <Link href={group.href} className={`${contentClasses}`}>
              {contentContent}
            </Link>
          ) : (
            <div className={contentClasses}>{contentContent}</div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={() =>
                setExpandedGroups((current) => ({
                  ...current,
                  [group.label]: !(current[group.label] ?? groupActive),
                }))
              }
              className="flex items-center justify-center rounded-xl px-2 py-2.5 text-white/90 hover:bg-white/10 transition"
              aria-label={groupExpanded ? "Contraer" : "Expandir"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${groupExpanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {groupExpanded ? <div className="flex flex-col gap-1">{group.children.map((item) => renderItem(item, true))}</div> : null}
      </div>
    );
  };

  return (
    <aside
      className={`sidebar-scrollbar flex h-screen shrink-0 flex-col overflow-y-auto border-r border-[#0f8f98] bg-[#19b3bc] px-4 py-5 transition-[width] duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className={`flex items-center px-2 ${collapsed ? "justify-center" : "gap-3"}`}>
        {!collapsed && (
          <>
            {state.image ? (
              <img
                src={state.image}
                alt={state.displayName}
                className="h-10 w-10 shrink-0 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#19b3bc]">
                {state.initials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{state.displayName}</p>
              <p className="truncate text-xs text-white/80">{state.clinicLabel}</p>
              {state.email ? <p className="truncate text-[11px] text-white/65">{state.email}</p> : null}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#19b3bc]"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
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

      <div className="mt-8">
        {!collapsed && <p className="px-2 text-xs font-medium uppercase tracking-[0.18em] text-white/65">Escritorios</p>}
        <nav className="mt-2 flex flex-col gap-1">
          {escritorioItems.map((item) => renderItem(item))}
          {visibleGroups.filter((group) => group.group === "escritorios").map(renderGroup)}
        </nav>
      </div>

      <div className="mt-6">
        {!collapsed && <p className="px-2 text-xs font-medium uppercase tracking-[0.18em] text-white/65">Páginas</p>}
        <nav className="mt-2 flex flex-col gap-1">
          {paginaItems.map((item) => renderItem(item))}
        </nav>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <Link
          href="/clinic-dashboard"
          className={`flex items-center rounded-xl text-sm font-medium transition-colors ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          } ${
            pathname === "/clinic-dashboard" || pathname.startsWith("/clinic-dashboard/")
              ? "bg-white text-[#19b3bc]"
              : "text-white/90 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Building2 className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          {!collapsed && <span className="min-w-0 truncate">Mi clínica</span>}
        </Link>

        <button
          type="button"
          onClick={actions.handleChangeClinic}
          className={`flex w-full items-center rounded-xl text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          }`}
        >
          <ChevronsUpDown className="h-[18px] w-[18px] text-white/90" />
          {!collapsed && <span>Cambiar sede</span>}
        </button>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className={`flex w-full items-center rounded-xl text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut className="h-[18px] w-[18px] text-white/90" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
