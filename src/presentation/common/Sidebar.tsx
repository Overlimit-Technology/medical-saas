"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vista General" },
  { href: "/agenda", label: "Agenda", roles: ["ADMIN", "SECRETARY", "DOCTOR"] },
  { href: "/clinical-visits", label: "Cita clínica", roles: ["DOCTOR"] },
  { href: "/crm", label: "Gestion de contactos y cobros", roles: ["ADMIN", "SECRETARY"] },
  { href: "/patients", label: "Pacientes", roles: ["ADMIN", "SECRETARY"] },
  { href: "/doctors", label: "Usuario", roles: ["ADMIN", "SECRETARY"] },
  { href: "/treatments", label: "Tratamientos", roles: ["ADMIN", "DOCTOR"] },
  { href: "/boxes", label: "Boxes", roles: ["ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  // Carga rol de sesión para mostrar solo las opciones permitidas.
  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.ok && data.session?.role) setRole(data.session.role);
      } catch {
        setRole(null);
      }
    };
    loadRole();
  }, []);

  const handleChangeClinic = async () => {
    await fetch("/api/clinics/clear", { method: "POST", credentials: "include" });
    window.location.assign("/select-clinic");
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
          MG
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Medigest</p>
          <p className="text-xs text-slate-500">Panel clinico</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wide text-slate-400">Navegacion</p>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => {
            if (!item.roles) return true;
            if (role === null) return false; // evita parpadeo hasta conocer el rol
            return item.roles.includes(role);
          }).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-6">
        <div className="grid gap-2">
          <button
            type="button"
            onClick={handleChangeClinic}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cambiar sede
          </button>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
