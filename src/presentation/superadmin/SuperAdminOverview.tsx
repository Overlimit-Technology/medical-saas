"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Building2, Database, Timer, Users } from "lucide-react";
import type { SuperAdminPlatformData } from "./platformTypes";
import { MODULE_COLORS, moduleLabel } from "./platformConstants";
import { Badge, formatNumber, PageHeader, ProgressBar, StatTile } from "./SuperAdminPrimitives";

function deltaClass(delta: string) {
  if (delta.startsWith("+")) return "text-emerald-600";
  if (delta.startsWith("-")) return "text-rose-600";
  return "text-slate-500";
}

function planTone(plan: string): "teal" | "amber" | "slate" | "rose" {
  if (plan === "Pro") return "teal";
  if (plan === "Trial") return "amber";
  if (plan === "Inactiva") return "rose";
  return "slate";
}

function activityTone(tone: SuperAdminPlatformData["activity"][number]["tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  return "bg-teal-50 text-teal-700";
}

export default function SuperAdminOverview({ data }: { data: SuperAdminPlatformData }) {
  const topClinics = data.clinics.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Overview"
        description="Panel general de Zensya con clinicas, usuarios, trials y uso real de la base."
        actions={
          <Link
            href="/super-admin/clinicas"
            className="inline-flex items-center rounded-lg bg-[#0e88ab] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b7897]"
          >
            Ver clinicas
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Clinicas activas"
          value={data.stats.activeClinics}
          sub={`de ${data.stats.totalClinics} registradas`}
          icon={Building2}
          tone="cyan"
        />
        <StatTile
          label="Usuarios totales"
          value={data.stats.totalUsers}
          sub={`${data.stats.activeUsers} activos`}
          icon={Users}
          tone="emerald"
        />
        <StatTile
          label="Trials activos"
          value={data.stats.activeTrials}
          sub={`${data.stats.trialsExpiringSoon} vencen pronto`}
          icon={Timer}
          tone="amber"
        />
        <StatTile
          label="Registros DB"
          value={formatNumber(data.stats.totalRecords)}
          sub={`${data.stats.averageUsagePercent}% uso relativo promedio`}
          icon={Database}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Clinicas</h2>
              <p className="text-sm text-slate-500">
                {data.stats.newClinicsMonth} nuevas este mes{" "}
                <span className={deltaClass(data.stats.newClinicsDelta)}>{data.stats.newClinicsDelta}</span>
              </p>
            </div>
            <Link href="/super-admin/clinicas" className="text-sm font-semibold text-[#0e88ab] hover:text-[#0b7897]">
              Ver todas
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Clinica</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Usuarios</th>
                  <th className="px-5 py-3 font-semibold">Modulos</th>
                  <th className="px-5 py-3 font-semibold">DB</th>
                </tr>
              </thead>
              <tbody>
                {topClinics.map((clinic) => (
                  <tr key={clinic.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{clinic.name}</p>
                      <p className="text-xs text-slate-500">{clinic.city || "Sin ciudad"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={planTone(clinic.plan)}>{clinic.plan}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {clinic.activeUsers}/{clinic.totalUsers} activos
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                        {clinic.activeModules.slice(0, 3).map((permission) => (
                          <span
                            key={permission}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${MODULE_COLORS[permission]}`}
                          >
                            {moduleLabel(permission)}
                          </span>
                        ))}
                        {clinic.activeModules.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            +{clinic.activeModules.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-[130px]">
                        <ProgressBar value={clinic.resources.usagePercent} tone="teal" />
                        <p className="mt-1 text-xs text-slate-500">
                          {formatNumber(clinic.resources.totalRecords)} registros
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Actividad reciente</h2>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 space-y-3">
            {data.activity.length === 0 ? (
              <p className="text-sm text-slate-500">Sin actividad reciente.</p>
            ) : (
              data.activity.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityTone(item.tone)}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.text}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.timeLabel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Usuarios creados</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{data.stats.newUsersMonth}</p>
          <p className={`mt-1 text-sm font-semibold ${deltaClass(data.stats.newUsersDelta)}`}>
            {data.stats.newUsersDelta} vs mes anterior
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Modulos activos</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {data.modules.filter((module) => module.clinicsEnabled > 0).length}
          </p>
          <p className="mt-1 text-sm text-slate-500">con acceso en al menos una clinica</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Trial mas critico</p>
          {data.trials.filter((trial) => trial.status === "active").length > 0 ? (
            <div>
              <p className="mt-2 text-xl font-bold text-slate-950">
                {
                  data.trials
                    .filter((trial) => trial.status === "active")
                    .sort((a, b) => a.remainingDays - b.remainingDays)[0].clinicName
                }
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {
                  data.trials
                    .filter((trial) => trial.status === "active")
                    .sort((a, b) => a.remainingDays - b.remainingDays)[0].remainingDays
                }{" "}
                dias restantes
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sin trials activos.</p>
          )}
        </section>
      </div>
    </div>
  );
}
