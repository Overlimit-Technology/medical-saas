"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  CalendarDays,
  KanbanSquare,
  Users,
  ClipboardList,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Search,
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
import { AppearanceButton } from "./appearance";
import { useLiquidBox } from "@/presentation/ui/motion";
import { Skel } from "@/presentation/ui/zs";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type Role = "ADMIN" | "SECRETARY" | "DOCTOR";

// Secciones agrupadas por lo que la persona viene a hacer, igual que el menu del portal del paciente.
type Group = "dia" | "pacientes" | "gestion";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: Group;
  matchPrefixes?: string[];
  /** Rutas que solo marcan el item si coinciden exactas. */
  exact?: string[];
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
    exact: ["/clinic-dashboard"],
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
    href: "/clinic-dashboard/clinica",
    label: "Mi clínica",
    icon: Building2,
    group: "gestion",
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

/** Curvas del sistema de movimiento (ver globals.css): suave para todo, con rebote solo en iconos. */
const EASE = "[transition-timing-function:cubic-bezier(.22,1,.36,1)]";
const SPRING = "[transition-timing-function:cubic-bezier(.34,1.56,.64,1)]";
const STORAGE_KEY = "zs-sidebar-collapsed";

type Box = { top: number; left: number; width: number; height: number };

/**
 * Menu de vidrio flotante. En pantallas de 1024px o mas va fijo a la izquierda y se puede plegar a
 * un riel de iconos (con etiqueta al pasar el mouse). Mas abajo es un cajon que se abre con el boton
 * de la barra superior (ver src/app/(app)/layout.tsx) y se cierra al navegar.
 *
 * Una sola pastilla blanca marca la seccion activa y se desliza hasta la que esta bajo el puntero.
 */
export default function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { state, actions } = useSidebarViewModel();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  /** Seccion recien clickeada: se marca al instante, aunque la pagina tarde en cargar. */
  const [pending, setPending] = useState<string | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [measuredPill, setPill] = useState<Box | null>(null);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // En el cajon del celular el menu siempre va abierto.
  const rail = collapsed && !mobileOpen;

  useEffect(() => {
    onMobileClose?.();
    setTip(null);
    setPending(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Recuerda si la persona dejo el menu plegado (solo en este navegador).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);
  const toggle = (next = !collapsed) => {
    setCollapsed(next);
    setTip(null);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  };

  // Avisos sin leer: punto en el riel y contador en el menu abierto.
  useEffect(() => {
    let alive = true;
    fetch("/api/internal-alerts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setUnread(Number(data?.unreadCount) || 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const openSearch = () => {
    toggle(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  // Ctrl/Cmd + K abre el buscador de secciones.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
  const itemActive = (item: NavItem) => isActive(item.matchPrefixes ?? [item.href]) || (item.exact ?? []).includes(pathname);
  const activeHref = visibleItems.find(itemActive)?.href ?? null;

  const needle = query.trim().toLowerCase();
  const shownItems = rail || !needle ? visibleItems : visibleItems.filter((item) => item.label.toLowerCase().includes(needle));

  // La pastilla va a la seccion bajo el puntero o, si no hay, a la activa.
  const target = pending ?? hovered ?? activeHref;
  const selectedHref = pending ?? activeHref;

  // Intencion de hover: la pastilla solo va a una opcion si el puntero se queda ahi un instante.
  // Asi no recorre todo el menu al pasar rapido: avanza opcion por opcion y se queda quieta.
  const HOVER_DWELL = 90;
  const hoverTo = (href: string | null) => {
    window.clearTimeout(hoverTimer.current);
    if (href === null) {
      setHovered(null);
      return;
    }
    hoverTimer.current = window.setTimeout(() => setHovered(href), HOVER_DWELL);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const el = target ? nav?.querySelector<HTMLElement>(`[data-nav="${target}"]`) : null;
    if (!nav || !el) {
      setPill(null);
      return;
    }
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill({ top: r.top - n.top + nav.scrollTop, left: r.left - n.left, width: r.width, height: r.height });
  }, [target, rail, needle, visibleItems.length, mobileOpen]);

  // Al cambiar de seccion la pastilla se estira y se recoge; al pasar el puntero solo se desliza.
  const pill = useLiquidBox(measuredPill, hovered === null);

  const showTip = (label: string) => (e: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>) => {
    if (!rail) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 14 });
  };
  const hideTip = () => setTip(null);

  const renderItem = (item: NavItem, index: number) => {
    const active = item.href === selectedHref;
    const loading = item.href === pending && pending !== activeHref;
    const Icon = item.icon;
    const badge = item.href === "/notifications" ? unread : 0;
    const enter = (e: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>) => {
      hoverTo(item.href);
      showTip(item.label)(e);
    };
    return (
      <Link
        key={item.href}
        href={item.href}
        data-nav={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={rail ? item.label : undefined}
        onMouseEnter={enter}
        onFocus={enter}
        onBlur={hideTip}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          window.clearTimeout(hoverTimer.current);
          setPending(item.href);
          setHovered(item.href);
          setTip(null);
        }}
        className={cx(
          "group relative z-[1] flex items-center rounded-full text-[14px] font-medium leading-5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#50c9d5]/60",
          rail ? "mx-auto h-11 w-11 shrink-0 justify-center" : "h-11 gap-3 pl-1.5 pr-3",
          active || hovered === item.href ? "text-slate-900" : "text-slate-600"
        )}
      >
        <span
          className={cx(
            "relative grid h-8 w-8 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-500",
            SPRING,
            active && "bg-[#50c9d5] text-[#080b04] shadow-[0_6px_16px_-6px_rgba(80,201,213,.9)]",
            rail && hovered === item.href && "scale-[1.15]",
            loading && "animate-pulse"
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {badge > 0 && rail ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#e5484d] ring-2 ring-white" aria-hidden="true" />
          ) : null}
        </span>
        {!rail ? (
          <>
            <span className="zs-label-in min-w-0 flex-1 truncate" style={{ "--n": index } as CSSProperties}>
              {item.label}
            </span>
            {badge > 0 ? (
              <span
                className="zs-label-in grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#e5484d] px-1.5 text-[11px] font-semibold text-white"
                style={{ "--n": index } as CSSProperties}
                aria-label={`${badge} sin leer`}
              >
                {badge}
              </span>
            ) : null}
          </>
        ) : null}
      </Link>
    );
  };

  const profileActive = isActive(["/profile", "/mis-boletas"]);
  const groups = (Object.keys(GROUP_LABEL) as Group[])
    .map((group) => ({ group, items: shownItems.filter((item) => item.group === group) }))
    .filter((g) => g.items.length);
  let counter = 0;

  const footerBtn = cx(
    "flex items-center rounded-full text-[14px] font-medium text-slate-600 transition-colors duration-300 hover:bg-white/80 hover:text-slate-900",
    rail ? "mx-auto h-11 w-11 justify-center" : "h-11 w-full gap-3 pl-1.5 pr-3"
  );

  return (
    <>
      {mobileOpen ? <div className="fixed inset-0 z-40 bg-[#0d1b2a]/45 backdrop-blur-[2px] lg:hidden" onClick={onMobileClose} aria-hidden="true" /> : null}
      <aside
        className={cx(
          "h-screen shrink-0 p-3 transition-[width,transform] duration-[420ms] max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[min(300px,86vw)]",
          EASE,
          rail ? "lg:w-[92px]" : "lg:w-[284px]",
          mobileOpen ? "" : "max-lg:-translate-x-full"
        )}
        aria-label="Menú principal"
      >
        <div className="zs-glass relative flex h-full flex-col overflow-hidden rounded-[28px] max-lg:!bg-white/[0.96]">
          {/* Brillo turquesa que sube desde abajo, como la luz calida del video de referencia. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(120%_70%_at_50%_100%,rgba(80,201,213,.30),rgba(80,201,213,.08)_45%,transparent_75%)]"
          />

          {/* Marca y boton para plegar */}
          <div className={cx("relative flex items-center pt-4", rail ? "flex-col gap-3 px-2" : "gap-3 px-4")}>
            <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3" aria-label="Ir a la vista general">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_18px_-8px_rgba(13,27,42,.35)]">
                <ZensyaLogo size={28} className="h-auto" />
              </span>
              {!rail && (
                <span className="zs-label-in min-w-0">
                  <b className="block truncate font-display text-[15.5px] font-bold leading-tight tracking-[-0.3px] text-slate-900">
                    {state.clinicLabel}
                  </b>
                  <small className="block text-[12px] leading-tight text-slate-500">Panel de la clínica</small>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => toggle()}
              onMouseEnter={showTip("Expandir")}
              onMouseLeave={hideTip}
              className={cx(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-[transform,border-color,color] duration-500 hover:scale-110 hover:border-[#50c9d5] hover:text-[#17656c] max-lg:hidden",
                SPRING,
                rail && "absolute right-1 top-2"
              )}
              aria-label={rail ? "Expandir menú" : "Plegar menú"}
            >
              <ChevronRight className={cx("h-4 w-4 transition-transform duration-500", EASE, !rail && "rotate-180")} strokeWidth={2.2} />
            </button>
          </div>

          {/* Buscador de secciones (Ctrl + K) */}
          <div className={cx("relative mt-4", rail ? "px-2" : "px-3")}>
            {rail ? (
              <button
                type="button"
                onClick={openSearch}
                onMouseEnter={showTip("Buscar · Ctrl K")}
                onMouseLeave={hideTip}
                className="group mx-auto grid h-11 w-11 place-items-center rounded-full text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900"
                aria-label="Buscar sección"
              >
                <Search className={cx("h-[18px] w-[18px] transition-transform duration-500 group-hover:scale-[1.18]", SPRING)} strokeWidth={1.8} />
              </button>
            ) : (
              <label className="zs-label-in flex h-10 items-center gap-2 rounded-full border border-white/80 bg-white/70 pl-3 pr-1.5 text-slate-500 shadow-[inset_0_1px_2px_rgba(13,27,42,.06)] transition focus-within:border-[#50c9d5] focus-within:ring-[3px] focus-within:ring-[#50c9d5]/20">
                <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setQuery("");
                    if (e.key === "Enter" && shownItems[0]) {
                      setQuery("");
                      router.push(shownItems[0].href);
                    }
                  }}
                  placeholder="Buscar sección"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-500"
                  aria-label="Buscar sección"
                />
                <kbd className="max-lg:hidden rounded-full border border-slate-200 bg-white px-2 py-0.5 font-sans text-[10.5px] font-semibold text-slate-500">Ctrl K</kbd>
              </label>
            )}
          </div>

          {/* Secciones */}
          <nav
            ref={navRef}
            className={cx("sidebar-scrollbar relative mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3", rail ? "px-2" : "px-3")}
            aria-label="Secciones"
            onMouseLeave={() => {
              hoverTo(null);
              hideTip();
            }}
            onScroll={hideTip}
          >
            {pill ? (
              <span
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute z-0 rounded-full border border-white bg-white/90 shadow-[0_8px_22px_-10px_rgba(13,27,42,.35)] transition-[top,left,width,height] duration-[260ms]",
                  EASE
                )}
                style={pill}
              />
            ) : null}
            {groups.map(({ group, items }, g) => (
              <div key={group} className={cx("flex flex-col", rail ? "gap-1.5" : "gap-0.5")}>
                {rail ? (
                  g > 0 ? <span className="mx-auto mb-1.5 h-px w-6 bg-slate-300/80" aria-hidden="true" /> : null
                ) : (
                  <span className="zs-label-in px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {GROUP_LABEL[group]}
                  </span>
                )}
                {items.map((item) => renderItem(item, counter++))}
              </div>
            ))}
            {!groups.length && needle ? <p className="px-3 py-4 text-[13px] text-slate-500">Ninguna sección se llama así.</p> : null}
            {/* Mientras se sabe el rol (y por lo tanto las secciones), su esqueleto en vez de un menu vacio. */}
            {state.role === null ? (
              <div className="zs-skel-wrap flex flex-col gap-1" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={cx("flex h-11 items-center gap-3", rail ? "mx-auto" : "pl-1.5")}>
                    <Skel className="h-8 w-8 shrink-0 rounded-full" />
                    {!rail ? <Skel className="h-3" style={{ width: `${[60, 45, 70, 55, 65, 50, 40, 58][i]}%` }} /> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </nav>

          {/* Perfil y sesion */}
          <div className={cx("relative flex flex-col gap-0.5 border-t border-white/70 pb-3 pt-3", rail ? "px-2" : "px-3")}>
            {state.canChangeClinic && !state.isSuperAdmin && (
              <button type="button" onClick={actions.handleChangeClinic} className={footerBtn} onMouseEnter={showTip("Cambiar sede")} onMouseLeave={hideTip} aria-label="Cambiar sede">
                <span className="grid h-8 w-8 shrink-0 place-items-center">
                  <ChevronsUpDown className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                {!rail && <span className="zs-label-in min-w-0 flex-1 text-left">Cambiar sede</span>}
              </button>
            )}

            <AppearanceButton rail={rail} className={footerBtn} onHover={showTip("Apariencia")} onLeave={hideTip} />

            <SharedSessionSwitcher collapsed={rail} />

            <form action="/api/auth/logout" method="post">
              <button type="submit" className={footerBtn} onMouseEnter={showTip("Cerrar sesión")} onMouseLeave={hideTip} aria-label="Cerrar sesión">
                <span className="grid h-8 w-8 shrink-0 place-items-center">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                {!rail && <span className="zs-label-in min-w-0 flex-1 text-left">Cerrar sesión</span>}
              </button>
            </form>

            <Link
              href="/profile"
              aria-current={profileActive ? "page" : undefined}
              aria-label={rail ? "Mi perfil" : undefined}
              onMouseEnter={showTip("Mi perfil")}
              onMouseLeave={hideTip}
              className={cx(
                "mt-1.5 flex items-center rounded-[20px] transition-[background-color,box-shadow] duration-300",
                rail ? "mx-auto justify-center p-1" : "gap-3 border border-white/80 bg-white/70 p-2 shadow-[0_6px_18px_-12px_rgba(13,27,42,.4)] hover:bg-white",
                profileActive && "ring-2 ring-[#50c9d5]/50"
              )}
            >
              <span className="relative h-9 w-9 shrink-0">
                <span className="block h-full w-full overflow-hidden rounded-full">
                  {state.image ? (
                    <img src={state.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-[12px] font-bold text-slate-900">
                      {state.initials}
                    </span>
                  )}
                </span>
                {/* En linea */}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#2fbf71] ring-2 ring-white" aria-hidden="true" />
              </span>
              {!rail && (
                <span className="zs-label-in min-w-0 flex-1">
                  <span className="block truncate font-display text-[14px] font-semibold text-slate-900">{state.displayName}</span>
                  <span className="block text-[12px] text-slate-500">Mi perfil</span>
                </span>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* Etiqueta del riel: va en el body para que el vidrio y el scroll no la recorten. */}
      {tip && typeof document !== "undefined"
        ? createPortal(
            <span
              key={tip.label}
              role="tooltip"
              className="zs-tip pointer-events-none fixed z-[70] whitespace-nowrap rounded-full bg-[#0d1b2a] px-3 py-1.5 text-[12.5px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(13,27,42,.6)] max-lg:hidden"
              style={{ top: tip.top, left: tip.left }}
            >
              {tip.label}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
