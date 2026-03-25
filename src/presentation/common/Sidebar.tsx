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
  ClipboardList,
  ChevronsUpDown,
  LogOut,
  UserCircle,
  MessageCircle,
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
    href: "/chat",
    label: "Chat",
    icon: MessageCircle,
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
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
  {
    href: "/form-templates",
    label: "Plantillas",
    icon: ClipboardList,
    roles: ["ADMIN", "DOCTOR"],
    group: "paginas",
  },
  {
    href: "/profile",
    label: "Mi perfil",
    icon: UserCircle,
    roles: ["ADMIN", "SECRETARY", "DOCTOR"],
    group: "paginas",
  },
];

type SidebarProfile = {
  ok: boolean;
  clinicLabel?: string;
  item?: {
    email: string;
    firstName: string;
    lastName: string;
    image: string | null;
    role: string;
  };
};

function getInitials(firstName: string, lastName: string, email: string) {
  const seed = `${firstName} ${lastName}`.trim() || email || "MG";
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("Medigest");
  const [clinicLabel, setClinicLabel] = useState("Panel clínico");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [initials, setInitials] = useState("MG");

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const res = await fetch("/api/profile/me", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as SidebarProfile;

        if (!data.ok || !data.item) {
          setRole(null);
          return;
        }

        setRole(data.item.role as Role);
        setEmail(data.item.email);
        setImage(data.item.image ?? null);
        setDisplayName(`${data.item.firstName} ${data.item.lastName}`.trim() || data.item.email);
        setClinicLabel(data.clinicLabel ?? "Sede actual");
        setInitials(getInitials(data.item.firstName, data.item.lastName, data.item.email));
      } catch {
        setRole(null);
      }
    };

    const handleProfileUpdated = () => {
      void loadSidebarData();
    };

    void loadSidebarData();
    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("focus", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("focus", handleProfileUpdated);
    };
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
        {image ? (
          <img
            src={image}
            alt={displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {initials}
          </div>
        )}

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {clinicLabel}
            </p>
            {email ? <p className="truncate text-[11px] text-slate-400">{email}</p> : null}
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
