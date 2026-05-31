"use client";

import { useState } from "react";
import { Activity, Bell, CalendarDays, Database, FileText, Server, Users } from "lucide-react";
import type { SuperAdminPlatformData } from "./platformTypes";
import { formatNumber, PageHeader, ProgressBar, StatTile } from "./SuperAdminPrimitives";

type ResourceTab = "database" | "operations";

function tabClass(active: boolean) {
  return active ? "bg-[#0e88ab] text-white" : "text-slate-600 hover:bg-slate-100";
}

export default function SuperAdminResources({ data }: { data: SuperAdminPlatformData }) {
  const [tab, setTab] = useState<ResourceTab>("database");
  const totals = data.clinics.reduce(
    (acc, clinic) => ({
      patients: acc.patients + clinic.resources.patients,
      appointments: acc.appointments + clinic.resources.appointments,
      records: acc.records + clinic.resources.clinicalRecords,
      observations: acc.observations + clinic.resources.observations,
      leads: acc.leads + clinic.resources.leads,
      alerts: acc.alerts + clinic.resources.alerts,
      totalRecords: acc.totalRecords + clinic.resources.totalRecords,
    }),
    { patients: 0, appointments: 0, records: 0, observations: 0, leads: 0, alerts: 0, totalRecords: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Recursos"
        description="Monitoreo operativo construido desde registros reales de la base por clinica."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setTab("database")} className={`rounded-md px-3 py-2 text-sm font-semibold ${tabClass(tab === "database")}`}>
              Base de datos
            </button>
            <button type="button" onClick={() => setTab("operations")} className={`rounded-md px-3 py-2 text-sm font-semibold ${tabClass(tab === "operations")}`}>
              Operacion
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Registros totales" value={formatNumber(totals.totalRecords)} icon={Database} tone="cyan" />
        <StatTile label="Pacientes" value={formatNumber(totals.patients)} icon={Users} tone="emerald" />
        <StatTile label="Citas" value={formatNumber(totals.appointments)} icon={CalendarDays} tone="violet" />
        <StatTile label="Alertas" value={formatNumber(totals.alerts)} icon={Bell} tone="amber" />
      </div>

      {tab === "database" ? (
        <DatabaseResources data={data} />
      ) : (
        <OperationalResources data={data} />
      )}
    </div>
  );
}

function DatabaseResources({ data }: { data: SuperAdminPlatformData }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Carga de base por clinica</h2>
        <p className="mt-1 text-sm text-slate-500">Pacientes, citas, fichas, observaciones y otros registros persistidos.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {data.clinics.map((clinic) => (
          <div key={clinic.id} className="grid gap-4 p-5 lg:grid-cols-[240px_1fr_180px] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${clinic.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                <p className="font-semibold text-slate-950">{clinic.name}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{clinic.city || "Sin ciudad"}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Pacientes" value={clinic.resources.patients} />
              <Metric label="Citas" value={clinic.resources.appointments} />
              <Metric label="Fichas" value={clinic.resources.clinicalRecords} />
              <Metric label="Observaciones" value={clinic.resources.observations} />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Total</span>
                <span>{formatNumber(clinic.resources.totalRecords)}</span>
              </div>
              <ProgressBar value={clinic.resources.usagePercent} tone={clinic.resources.usagePercent > 75 ? "rose" : "teal"} />
              <p className="mt-1 text-xs text-slate-500">{clinic.resources.usagePercent}% relativo</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OperationalResources({ data }: { data: SuperAdminPlatformData }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Uso operativo por clinica</h2>
        <p className="mt-1 text-sm text-slate-500">Senales de actividad que ya existen en la base: leads, caja, alertas y plantillas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
              <th className="px-5 py-3 font-semibold">Clinica</th>
              <th className="px-5 py-3 font-semibold">Leads</th>
              <th className="px-5 py-3 font-semibold">Movimientos caja</th>
              <th className="px-5 py-3 font-semibold">Plantillas</th>
              <th className="px-5 py-3 font-semibold">Alertas</th>
              <th className="px-5 py-3 font-semibold">Boxes</th>
              <th className="px-5 py-3 font-semibold">Actividad</th>
            </tr>
          </thead>
          <tbody>
            {data.clinics.map((clinic) => {
              const activityScore = clinic.resources.leads + clinic.resources.cashMovements + clinic.resources.alerts + clinic.resources.appointments;
              const maxScore = Math.max(
                1,
                ...data.clinics.map(
                  (item) => item.resources.leads + item.resources.cashMovements + item.resources.alerts + item.resources.appointments
                )
              );
              const pct = Math.round((activityScore / maxScore) * 100);
              return (
                <tr key={clinic.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{clinic.name}</p>
                    <p className="text-xs text-slate-500">{clinic.plan}</p>
                  </td>
                  <td className="px-5 py-4">{formatNumber(clinic.resources.leads)}</td>
                  <td className="px-5 py-4">{formatNumber(clinic.resources.cashMovements)}</td>
                  <td className="px-5 py-4">{formatNumber(clinic.resources.formTemplates)}</td>
                  <td className="px-5 py-4">{formatNumber(clinic.resources.alerts)}</td>
                  <td className="px-5 py-4">{formatNumber(clinic.resources.boxes)}</td>
                  <td className="px-5 py-4">
                    <div className="w-[140px]">
                      <ProgressBar value={pct} tone="violet" />
                      <p className="mt-1 text-xs text-slate-500">{pct}% relativo</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        {label === "Pacientes" ? <Users className="h-4 w-4 text-slate-400" /> : label === "Citas" ? <Activity className="h-4 w-4 text-slate-400" /> : label === "Fichas" ? <FileText className="h-4 w-4 text-slate-400" /> : <Server className="h-4 w-4 text-slate-400" />}
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-950">{formatNumber(value)}</p>
    </div>
  );
}
