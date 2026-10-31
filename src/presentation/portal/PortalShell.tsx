"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FolderOpen,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Activity,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import ZensyaLogo from "./ZensyaLogo";

type Props = {
  slug: string;
  clinicName: string;
  clinicPhone: string | null;
  patientName: string;
  initials: string;
  pendingAppointments: number;
  pendingPayments: number;
  children: React.ReactNode;
};

type Item = { seg: string; label: string; icon: LucideIcon; count?: number };

export default function PortalShell(props: Props) {
  const { slug } = props;
  const base = `/portal/${slug}`;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.getElementById("zp-root")?.dataset.theme === "dark");
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const root = document.getElementById("zp-root");
    if (root) root.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("zensya-portal-theme", next ? "dark" : "light");
    } catch {
      // Sin almacenamiento el tema vuelve a claro al recargar.
    }
  };

  const href = (seg: string) => (seg ? `${base}/${seg}` : base);
  const isActive = (seg: string) => (seg ? pathname === href(seg) || pathname.startsWith(`${href(seg)}/`) : pathname === base);

  const groups: { label: string; items: Item[] }[] = [
    {
      label: "Mi atención",
      items: [
        { seg: "", label: "Inicio", icon: Home },
        { seg: "reservar", label: "Reservar hora", icon: CalendarPlus },
        { seg: "citas", label: "Mis citas", icon: CalendarDays, count: props.pendingAppointments },
      ],
    },
    {
      label: "Mi salud",
      items: [
        { seg: "tratamiento", label: "Mi tratamiento", icon: Activity },
        { seg: "historial", label: "Historial clínico", icon: ClipboardList },
        { seg: "documentos", label: "Documentos", icon: FolderOpen },
      ],
    },
    { label: "Trámites", items: [{ seg: "pagos", label: "Pagos", icon: Wallet, count: props.pendingPayments }] },
  ];

  const navLink = (item: Item) => {
    const Icon = item.icon;
    return (
      <Link key={item.seg} href={href(item.seg)} aria-current={isActive(item.seg) ? "page" : undefined}>
        <span className="nav-ic">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        {item.label}
        {item.count ? <span className="count">{item.count}</span> : null}
      </Link>
    );
  };

  return (
    <>
      <header className="top">
        <div className="top-in">
          <button className="ibtn burger" type="button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <Link className="brand" href={base} aria-label="Ir al inicio">
            <ZensyaLogo size={38} />
            <div style={{ minWidth: 0 }}>
              <b>{props.clinicName}</b>
              <small>Portal del paciente</small>
            </div>
          </Link>
          <div className="top-actions">
            <button className="ibtn" type="button" onClick={toggleTheme} aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} aria-pressed={dark}>
              {dark ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
            </button>
            <Link className="me" href={href("perfil")} aria-label="Mi perfil">
              <span className="avatar">{props.initials}</span>
              <b>{props.patientName}</b>
            </Link>
          </div>
        </div>
      </header>

      <div className="shell">
        <aside className={`side ${open ? "open" : ""}`} aria-label="Menú principal">
          <nav className="nav" aria-label="Secciones del portal">
            {groups.map((group) => (
              <div className="nav-group nav" key={group.label}>
                <span className="label">{group.label}</span>
                {group.items.map(navLink)}
              </div>
            ))}
          </nav>
          <div className="help">
            <div className="help-top">
              <b>¿Necesitas ayuda?</b>
              <ZensyaLogo size={30} />
            </div>
            <p>Llama o escribe a {props.clinicName}.</p>
            {props.clinicPhone ? <span className="phone">{props.clinicPhone}</span> : null}
          </div>
          <nav className="nav" aria-label="Cuenta">
            {navLink({ seg: "perfil", label: "Mi perfil", icon: UserRound })}
            <form action={`/api/portal/${slug}/auth/salir`} method="post">
              <button className="nav-item" type="submit">
                <span className="nav-ic">
                  <LogOut size={18} strokeWidth={1.8} />
                </span>
                Cerrar sesión
              </button>
            </form>
          </nav>
        </aside>
        <div className={`scrim ${open ? "on" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
        <main className="main">{props.children}</main>
      </div>

      <nav className="tabbar" aria-label="Accesos rápidos">
        <Link href={base} aria-current={isActive("") ? "page" : undefined}>
          <Home size={20} strokeWidth={1.8} />
          Inicio
        </Link>
        <Link href={href("citas")} aria-current={isActive("citas") ? "page" : undefined}>
          <CalendarDays size={20} strokeWidth={1.8} />
          Citas
        </Link>
        <Link href={href("reservar")} className="fab" aria-current={isActive("reservar") ? "page" : undefined}>
          <span>
            <CalendarPlus size={20} strokeWidth={1.8} />
          </span>
          Reservar
        </Link>
        <Link href={href("historial")} aria-current={isActive("historial") ? "page" : undefined}>
          <ClipboardList size={20} strokeWidth={1.8} />
          Historial
        </Link>
        <button type="button" onClick={() => setOpen(true)}>
          <LayoutGrid size={20} strokeWidth={1.8} />
          Más
        </button>
      </nav>
    </>
  );
}
