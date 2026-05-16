"use client";

import { useMemo, useState } from "react";
import { Laptop, Power, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import type { SuperAdminPlatformData, SuperAdminUserRow } from "./platformTypes";
import { ROLE_LABELS } from "./platformConstants";
import {
  Badge,
  displayUserName,
  EmptyState,
  formatDate,
  getInitials,
  PageHeader,
  StatTile,
} from "./SuperAdminPrimitives";

function roleTone(user: SuperAdminUserRow): "rose" | "teal" | "violet" | "slate" {
  if (user.isSuperAdmin) return "rose";
  if (user.role === "ADMIN") return "teal";
  if (user.role === "DOCTOR") return "violet";
  return "slate";
}

function statusTone(status: SuperAdminUserRow["status"]): "emerald" | "amber" | "rose" {
  if (status === "ACTIVE") return "emerald";
  if (status === "PENDING") return "amber";
  return "rose";
}

export default function SuperAdminUsers({ data }: { data: SuperAdminPlatformData }) {
  const [users, setUsers] = useState(data.users);
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clinics = useMemo(() => data.clinics.map((clinic) => ({ id: clinic.id, name: clinic.name })), [data.clinics]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return users.filter((user) => {
      const name = displayUserName(user).toLowerCase();
      const matchesSearch =
        normalized.length === 0 ||
        name.includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.clinicNames.some((clinic) => clinic.toLowerCase().includes(normalized));
      const matchesClinic = clinicFilter === "all" || user.clinicIds.includes(clinicFilter);
      const matchesRole = roleFilter === "all" || user.platformRole === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesClinic && matchesRole && matchesStatus;
    });
  }, [clinicFilter, roleFilter, search, statusFilter, users]);

  const allSelected = filtered.length > 0 && filtered.every((user) => selectedIds.includes(user.id));

  const patchUser = async (user: SuperAdminUserRow, payload: { status?: "ACTIVE" | "SUSPENDED"; usesNewPlatform?: boolean }) => {
    setPendingId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/super-admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok: boolean;
            item?: { id: string; status: SuperAdminUserRow["status"]; usesNewPlatform: boolean };
            error?: string;
          }
        | null;

      if (!response.ok || !result?.ok || !result.item) {
        throw new Error(result?.error ?? "No se pudo actualizar el usuario.");
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, status: result.item?.status ?? item.status, usesNewPlatform: result.item?.usesNewPlatform ?? item.usesNewPlatform }
            : item
        )
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el usuario.");
    } finally {
      setPendingId(null);
    }
  };

  const toggleSelected = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Usuarios"
        description="Usuarios reales de todas las clinicas, con estado, rol, permisos y acceso al software."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Usuarios" value={users.length} icon={Users} tone="cyan" />
        <StatTile label="Activos" value={users.filter((user) => user.status === "ACTIVE").length} icon={UserCheck} tone="emerald" />
        <StatTile label="Super admins" value={users.filter((user) => user.isSuperAdmin).length} icon={ShieldCheck} tone="rose" />
        <StatTile
          label="Nuevo software"
          value={users.filter((user) => user.usesNewPlatform).length}
          icon={Laptop}
          tone="violet"
        />
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre, email o clinica..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[#0e88ab] focus:bg-white"
            />
          </div>
          <select
            value={clinicFilter}
            onChange={(event) => setClinicFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0e88ab]"
          >
            <option value="all">Todas las clinicas</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0e88ab]"
          >
            <option value="all">Todos los roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin Clinica</option>
            <option value="DOCTOR">Medico</option>
            <option value="SECRETARY">Recepcionista</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0e88ab]"
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
            <option value="PENDING">Pendientes</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
            {selectedIds.length} usuario{selectedIds.length === 1 ? "" : "s"} seleccionado{selectedIds.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin resultados">Ajusta los filtros para ver usuarios.</EmptyState>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? [] : filtered.map((user) => user.id))}
                      aria-label="Seleccionar usuarios"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Clinicas</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Software</th>
                  <th className="px-4 py-3 font-semibold">Permisos</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const busy = pendingId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-slate-100 last:border-b-0 ${selectedIds.includes(user.id) ? "bg-cyan-50/70" : ""}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          aria-label={`Seleccionar ${displayUserName(user)}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0e88ab] text-xs font-bold text-white">
                            {getInitials(displayUserName(user))}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-950">{displayUserName(user)}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Creado {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {user.clinicNames.length > 0 ? user.clinicNames.join(", ") : "Sin clinica"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={roleTone(user)}>{ROLE_LABELS[user.platformRole]}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {user.usesNewPlatform ? "Nuevo" : "Clasico"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {user.isSuperAdmin ? "Todos" : user.permissions.length}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy || user.isSuperAdmin}
                            onClick={() =>
                              void patchUser(user, {
                                status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Power className="h-3.5 w-3.5" />
                            {user.status === "ACTIVE" ? "Suspender" : "Activar"}
                          </button>
                          <button
                            type="button"
                            disabled={busy || user.isSuperAdmin}
                            onClick={() => void patchUser(user, { usesNewPlatform: !user.usesNewPlatform })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Laptop className="h-3.5 w-3.5" />
                            Cambiar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
