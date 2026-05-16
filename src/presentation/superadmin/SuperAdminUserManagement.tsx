"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Laptop, Power, ShieldCheck, Users } from "lucide-react";

type ClinicSummary = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
};

type ClinicUser = {
  membershipId: string;
  id: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "SECRETARY";
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  isSuperAdmin: boolean;
  usesNewPlatform: boolean;
  firstName: string;
  lastName: string;
};

type SelectedClinic = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
};

const ROLE_LABELS: Record<ClinicUser["role"], string> = {
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  SECRETARY: "Secretaria",
};

function getDisplayName(user: ClinicUser) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export default function SuperAdminUserManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedClinicId = searchParams.get("clinicId");

  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<SelectedClinic | null>(null);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    const loadClinics = async () => {
      setLoadingClinics(true);
      setError(null);
      try {
        const res = await fetch("/api/super-admin/clinics", { cache: "no-store" });
        const data = await res.json().catch(() => null) as
          | { ok: boolean; items?: ClinicSummary[]; error?: string }
          | null;

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? "No se pudieron cargar las sedes.");
        }

        setClinics(data.items ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las sedes.");
      } finally {
        setLoadingClinics(false);
      }
    };

    void loadClinics();
  }, []);

  useEffect(() => {
    if (!selectedClinicId) {
      setSelectedClinic(null);
      setUsers([]);
      return;
    }

    const loadClinicUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const res = await fetch(`/api/super-admin/clinics/${selectedClinicId}/users`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null) as
          | { ok: boolean; clinic?: SelectedClinic; items?: ClinicUser[]; error?: string }
          | null;

        if (!res.ok || !data?.ok || !data.clinic) {
          throw new Error(data?.error ?? "No se pudieron cargar los usuarios de la sede.");
        }

        setSelectedClinic(data.clinic);
        setUsers(data.items ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los usuarios de la sede."
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadClinicUsers();
  }, [selectedClinicId]);

  const summary = useMemo(() => {
    return {
      totalClinics: clinics.length,
      totalUsers: clinics.reduce((acc, clinic) => acc + clinic.totalUsers, 0),
      activeUsers: clinics.reduce((acc, clinic) => acc + clinic.activeUsers, 0),
      inactiveUsers: clinics.reduce((acc, clinic) => acc + clinic.inactiveUsers, 0),
    };
  }, [clinics]);

  const openClinic = (clinicId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("clinicId", clinicId);
    startTransition(() => {
      router.replace(`/gestion-usuarios?${params.toString()}`);
    });
  };

  const clearClinic = () => {
    startTransition(() => {
      router.replace("/gestion-usuarios");
    });
  };

  const updateUser = async (
    userId: string,
    payload: { status?: "ACTIVE" | "SUSPENDED"; usesNewPlatform?: boolean }
  ) => {
    setPendingActionId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as
        | { ok: boolean; item?: ClinicUser; error?: string }
        | null;

      if (!res.ok || !data?.ok || !data.item) {
        throw new Error(data?.error ?? "No se pudo actualizar el usuario.");
      }

      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, ...data.item } : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el usuario.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-[#19b3bc]/10 px-3 py-1 text-xs font-semibold text-[#0f8f98]">
            Solo Super Admin
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Gestionar Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra sedes, acceso al sistema y el software que usa cada usuario.
          </p>
        </div>
        <Link
          href="/clinic-dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Volver a Mi clínica
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Sedes registradas" value={summary.totalClinics} icon={Building2} accent="cyan" />
        <SummaryCard label="Usuarios visibles" value={summary.totalUsers} icon={Users} accent="blue" />
        <SummaryCard label="Activos" value={summary.activeUsers} icon={ShieldCheck} accent="emerald" />
        <SummaryCard label="Inactivos" value={summary.inactiveUsers} icon={Power} accent="amber" />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Nivel 1 · Sedes</p>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona una sede para ver y administrar sus usuarios.
            </p>
          </div>
          {selectedClinic && (
            <button
              type="button"
              onClick={clearClinic}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Ver todas las sedes
            </button>
          )}
        </div>

        {loadingClinics ? (
          <p className="py-6 text-sm text-slate-500">Cargando sedes...</p>
        ) : clinics.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">No hay sedes registradas.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clinics.map((clinic) => {
              const selected = clinic.id === selectedClinicId;
              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => openClinic(clinic.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-[#19b3bc] bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{clinic.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{clinic.city}</p>
                    </div>
                    <ArrowRight className={selected ? "text-[#19b3bc]" : "text-slate-300"} size={18} />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <MiniStat label="Total" value={clinic.totalUsers} />
                    <MiniStat label="Activos" value={clinic.activeUsers} />
                    <MiniStat label="Inactivos" value={clinic.inactiveUsers} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedClinic && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Nivel 2 · Usuarios de la sede</p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedClinic.name} · {selectedClinic.city}
              </p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {users.length} usuario{users.length === 1 ? "" : "s"}
            </div>
          </div>

          {loadingUsers ? (
            <p className="py-6 text-sm text-slate-500">Cargando usuarios de la sede...</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">Esta sede no tiene usuarios activos asignados.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Software</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const busy = pendingActionId === user.id;
                    return (
                      <tr key={user.id} className="border-b border-slate-50 last:border-b-0">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{getDisplayName(user)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {user.status === "ACTIVE" ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              user.usesNewPlatform
                                ? "bg-cyan-50 text-cyan-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Laptop size={12} />
                            {user.usesNewPlatform ? "Software nuevo" : "Zensya"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {user.status === "ACTIVE" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateUser(user.id, { status: "SUSPENDED" })}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Deshabilitar
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void updateUser(user.id, { status: "ACTIVE" })}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Activar
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void updateUser(user.id, { usesNewPlatform: !user.usesNewPlatform })
                              }
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {user.usesNewPlatform ? "Enviar al software nuevo" : "Volver a Zensya"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  accent: "cyan" | "blue" | "emerald" | "amber";
}) {
  const styles = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${styles[accent]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
