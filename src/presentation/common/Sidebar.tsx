"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasPermission, type UserPermission } from "@/lib/permissions";

const NAV_ITEMS = [
  { href: "/profile", label: "Mi perfil", roles: ["ADMIN", "SECRETARY", "DOCTOR"] },
  { href: "/dashboard", label: "Vista General" },
  { href: "/agenda", label: "Agenda", roles: ["ADMIN"], permission: "AGENDA" },
  { href: "/clinical-visits", label: "Cita clinica", roles: [], permission: "CLINICAL_VISITS" },
  { href: "/chat", label: "Chat", roles: ["ADMIN"], permission: "CHAT" },
  { href: "/chat-meta", label: "Chat Meta", roles: ["ADMIN"], permission: "CHAT_META" },
  { href: "/formulario-chat", label: "Formulario Chat", roles: ["ADMIN"], permission: "CHAT_FORM" },
  { href: "/patients", label: "Pacientes", roles: ["ADMIN"], permission: "PATIENTS" },
  { href: "/usuarios", label: "Usuario", roles: ["ADMIN"], permission: "USERS" },
  { href: "/treatments", label: "Tratamientos", roles: ["ADMIN"], permission: "TREATMENTS" },
  { href: "/boxes", label: "Boxes", roles: ["ADMIN"], permission: "BOXES" },
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
    isSuperAdmin: boolean;
    permissions: string[];
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
  const [role, setRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("Medigest");
  const [clinicLabel, setClinicLabel] = useState("Panel clinico");
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
          setIsSuperAdmin(false);
          setPermissions([]);
          return;
        }

        setRole(data.item.role);
        setIsSuperAdmin(data.item.isSuperAdmin === true);
        setPermissions(data.item.permissions ?? []);
        setEmail(data.item.email);
        setImage(data.item.image ?? null);
        setDisplayName(`${data.item.firstName} ${data.item.lastName}`.trim() || data.item.email);
        setClinicLabel(data.clinicLabel ?? "Sede actual");
        setInitials(getInitials(data.item.firstName, data.item.lastName, data.item.email));
      } catch {
        setRole(null);
        setIsSuperAdmin(false);
        setPermissions([]);
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
    await fetch("/api/clinics/clear", { method: "POST", credentials: "include" });
    window.location.assign("/select-clinic");
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <div className="flex items-center gap-3">
        {image ? (
          <img src={image} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-xs text-slate-500">{clinicLabel}</p>
          {email ? <p className="truncate text-[11px] text-slate-400">{email}</p> : null}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wide text-slate-400">Navegacion</p>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => {
            if (!item.roles) return true;
            if (role === null) return false;
            if (item.permission === "CLINICAL_VISITS") {
              return role === "DOCTOR" && permissions.includes("CLINICAL_VISITS");
            }
            if (item.permission) {
              return hasPermission(
                role,
                permissions,
                item.permission as UserPermission,
                isSuperAdmin
              );
            }
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
