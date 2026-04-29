"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Database, Hospital, Search, Users } from "lucide-react";

type OverviewResponse = {
  ok: boolean;
  data?: {
    stats: {
      totalClinics: number;
      activeClinics: number;
      totalUsers: number;
      activeUsers: number;
      newClinicsMonth: number;
      newClinicsDelta: string;
      newUsersMonth: number;
      newUsersDelta: string;
    };
    clinics: Array<{
      id: string;
      name: string;
      city: string;
      status: "active" | "inactive";
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
    }>;
    activity: Array<{
      id: string;
      text: string;
      timeLabel: string;
      tone: "teal" | "success";
    }>;
  };
  error?: string;
};

function getPlanLabel(totalUsers: number, status: "active" | "inactive") {
  if (status !== "active") return "Starter";
  if (totalUsers >= 10) return "Pro";
  if (totalUsers >= 5) return "Trial";
  return "Starter";
}

function planClassName(plan: string) {
  if (plan === "Pro") return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";
  if (plan === "Trial") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function statDeltaClassName(delta: string) {
  if (delta.startsWith("+")) return "text-emerald-600";
  if (delta.startsWith("-")) return "text-rose-600";
  return "text-slate-500";
}

export default function SuperAdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse["data"] | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/super-admin/overview", { cache: "no-store", credentials: "include" });
        const payload = (await response.json().catch(() => null)) as OverviewResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error ?? "No se pudo cargar el overview de super admin.");
        }
        setData(payload.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el overview.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const clinicRows = useMemo(() => {
    if (!data) return [];
    return data.clinics.map((clinic) => ({
      ...clinic,
      plan: getPlanLabel(clinic.totalUsers, clinic.status),
      usage: clinic.totalUsers > 0 ? Math.round((clinic.activeUsers / clinic.totalUsers) * 100) : 0,
    }));
  }, [data]);

  if (loading) {
    return <div className="py-8 text-sm text-slate-500">Cargando overview...</div>;
  }

  if (error || !data) {
    return <div className="py-8 text-sm text-rose-600">{error ?? "No hay datos disponibles."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <span>Super Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-800">Overview</span>
          </div>
          <h1 className="mt-2 text-[34px] font-semibold leading-none text-slate-900">Overview</h1>
          <p className="mt-2 text-sm text-slate-500">Panel de control general - Zensya Admin</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-[210px] border-0 bg-transparent p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0e88ab] text-sm font-bold text-white">
            SA
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Clinicas activas</p>
            <Hospital className="h-5 w-5 text-cyan-600" />
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{data.stats.activeClinics}</p>
          <p className="mt-1 text-sm text-slate-500">de {data.stats.totalClinics} registradas</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Usuarios totales</p>
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{data.stats.totalUsers}</p>
          <p className="mt-1 text-sm text-slate-500">{data.stats.activeUsers} activos</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Nuevas clinicas</p>
            <Hospital className="h-5 w-5 text-slate-600" />
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{data.stats.newClinicsMonth}</p>
          <p className={`mt-1 text-sm font-semibold ${statDeltaClassName(data.stats.newClinicsDelta)}`}>
            {data.stats.newClinicsDelta} este mes
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Nuevos usuarios</p>
            <Database className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{data.stats.newUsersMonth}</p>
          <p className={`mt-1 text-sm font-semibold ${statDeltaClassName(data.stats.newUsersDelta)}`}>
            {data.stats.newUsersDelta} este mes
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-2xl font-semibold text-slate-900">Clinicas</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-2 py-3 font-semibold">Clinica</th>
                  <th className="px-2 py-3 font-semibold">Plan</th>
                  <th className="px-2 py-3 font-semibold">Estado</th>
                  <th className="px-2 py-3 font-semibold">Usuarios</th>
                  <th className="px-2 py-3 font-semibold">DB Usage</th>
                </tr>
              </thead>
              <tbody>
                {clinicRows.map((clinic) => (
                  <tr key={clinic.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-2 py-4 font-semibold text-slate-900">{clinic.name}</td>
                    <td className="px-2 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${planClassName(clinic.plan)}`}>
                        {clinic.plan}
                      </span>
                    </td>
                    <td className="px-2 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          clinic.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {clinic.status === "active" ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-2 py-4">{clinic.totalUsers}</td>
                    <td className="px-2 py-4">
                      <div className="h-2.5 w-[120px] rounded-full bg-slate-100">
                        <div className="h-2.5 rounded-full bg-[#1a8ca9]" style={{ width: `${clinic.usage}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{clinic.usage}%</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-2xl font-semibold text-slate-900">Actividad reciente</h2>
          <div className="mt-3 space-y-1">
            {data.activity.length === 0 ? (
              <p className="text-sm text-slate-500">Sin actividad reciente.</p>
            ) : (
              data.activity.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-100 px-3 py-3">
                  <p className="text-sm font-medium text-slate-800">{item.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.timeLabel}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

