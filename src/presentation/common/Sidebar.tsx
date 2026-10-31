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
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
  Activity,
  Building2,
  UserCog,
  Settings,
  Sparkles,
  HeartPulse,
} from "lucide-react";

import { hasPermission, type UserPermission } from "@/lib/permissions";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { useSidebarViewModel } from "./SidebarViewModel";
import SharedSessionSwitcher from "./SharedSessionSwitcher";

type Role = "ADMIN" | "SECRETARY" | "DOCTOR";

// Secciones agrupadas por lo que la persona viene a hacer, igual que el menu del portal del paciente.
type Group = "dia" | "pacientes" | "gestion";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: Group;
  matchPrefixes?: string[];
  roles?: Role[];
  permission?: UserPermission;
  doctorOnlyWithPermission?: boolean;
};

const GROUP_LABEL: Record<Group, string> = {
  dia: "Mi día",
  pacientes: "Pacientes",
  gestion: "Gestión",
};

// Los permisos de cada item son los mismos de antes; solo cambian el orden y los grupos.
// Mi boleta ya no va en el menu: es un apartado personal y vive dentro de Mi perfil.
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Vista general",
    icon: LayoutGrid,
    group: "dia",
    matchPrefixes: ["/dashboard"],
  },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, group: "dia", permission: "AGENDA" },
  {
    href: "/notifications",
    label: "Notificaciones",
    icon: Bell,
    group: "dia",
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
  },
  { href: "/chat", label: "Mensajería interna", icon: MessageCircle, group: "dia" },
  {
    href: "/clinical-visits",
    label: "Cita clínica",
    icon: ClipboardList,
    group: "pacientes",
    permission: "CLINICAL_VISITS",
    doctorOnlyWithPermission: true,
  },
  { href: "/patients", label: "Historial paciente", icon: Users, group: "pacientes", permission: "PATIENTS" },
  { href: "/seguimiento", label: "Seguimiento", icon: Activity, group: "pacientes", permission: "SEGUIMIENTO" },
  {
    href: "/portal-paciente",
    label: "Portal paciente",
    icon: HeartPulse,
    group: "pacientes",
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
  },
  { href: "/asistente-ia", label: "Asistente IA", icon: Sparkles, group: "pacientes", roles: ["DOCTOR"] },
  {
    href: "/crm",
    label: "CRM",
    icon: KanbanSquare,
    group: "gestion",
    permission: "LEADS",
    matchPrefixes: ["/crm", "/chat-meta", "/leads"],
  },
  {
    href: "/clinic-dashboard",
    label: "Mi clínica",
    icon: Building2,
    group: "gestion",
    matchPrefixes: ["/clinic-dashboard"],
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    group: "gestion",
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
  },
  { href: "/gestion-usuarios", label: "Gestionar usuarios", icon: UserCog, group: "gestion", roles: ["ADMIN"] },
];

const itemBase =
  "group flex w-full items-center rounded-2xl border text-[14px] font-medium leading-5 transition-colors";

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] transition-[background-color,color,transform] duration-300 ${
        active ? "bg-[#50c9d5] text-[#080b04]" : "group-hover:-rotate-[8deg]"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </span>
  );
}

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

  const isActive = (prefixes: string[]) =>
    prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  const itemClass = (active: boolean) =>
    `${itemBase} ${collapsed ? "justify-center px-0 py-1" : "gap-3 px-3 py-[7px]"} ${
      active
        ? "border-[#50c9d5]/30 bg-[#50c9d5]/[0.08] text-slate-900"
        : "border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
    }`;

  const renderItem = (item: NavItem) => {
    const active = isActive(item.matchPrefixes ?? [item.href]);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={itemClass(active)}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
      >
        <NavIcon icon={item.icon} active={active} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      </Link>
    );
  };

  const profileActive = isActive(["/profile", "/mis-boletas", "/vacaciones"]);

  return (
    <aside
      className={`sidebar-scrollbar flex h-screen shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-200 bg-[#f4f7f9] px-3 py-4 transition-[width] duration-300 ${
        collapsed ? "w-[76px]" : "w-[268px]"
      }`}
      aria-label="Menú principal"
    >
      <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "gap-3 px-1"}`}>
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3" aria-label="Ir a la vista general">
          <ZensyaLogo size={collapsed ? 32 : 36} className="h-auto shrink-0" />
          {!collapsed && (
            <span className="min-w-0">
              <b className="block truncate font-display text-[16px] font-bold leading-tight tracking-[-0.3px] text-slate-900">
                {state.clinicLabel}
              </b>
              <small className="block text-[12px] leading-tight text-slate-500">Panel de la clínica</small>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#50c9d5] hover:bg-[#50c9d5]/[0.08]"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[17px] w-[17px]" strokeWidth={1.8} />
          ) : (
            <PanelLeftClose className="h-[17px] w-[17px]" strokeWidth={1.8} />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-4" aria-label="Secciones">
        {(Object.keys(GROUP_LABEL) as Group[]).map((group) => {
          const items = visibleItems.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="flex flex-col gap-1">
              {!collapsed && (
                <span className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {GROUP_LABEL[group]}
                </span>
              )}
              {items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-4">
        <Link
          href="/profile"
          className={itemClass(profileActive)}
          aria-current={profileActive ? "page" : undefined}
          title="Mi perfil"
        >
          <span className="relative h-[34px] w-[34px] shrink-0 overflow-hidden rounded-full">
            {state.image ? (
              <img src={state.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-[12px] font-bold text-slate-900">
                {state.initials}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[14px] font-semibold text-slate-900">
                {state.displayName}
              </span>
              <span className="block text-[12px] text-slate-500">Mi perfil</span>
            </span>
          )}
        </Link>

        {state.canChangeClinic && !state.isSuperAdmin && (
          <button type="button" onClick={actions.handleChangeClinic} className={itemClass(false)} title="Cambiar sede">
            <NavIcon icon={ChevronsUpDown} active={false} />
            {!collapsed && <span className="min-w-0 flex-1 text-left">Cambiar sede</span>}
          </button>
        )}

        <SharedSessionSwitcher collapsed={collapsed} />

        <form action="/api/auth/logout" method="post">
          <button type="submit" className={itemClass(false)} title="Cerrar sesión">
            <NavIcon icon={LogOut} active={false} />
            {!collapsed && <span className="min-w-0 flex-1 text-left">Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
