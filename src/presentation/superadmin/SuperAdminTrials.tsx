"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Timer, Zap } from "lucide-react";
import type { SuperAdminPlatformData, SuperAdminTrialRow } from "./platformTypes";
import { Badge, formatDate, PageHeader, ProgressBar, StatTile } from "./SuperAdminPrimitives";

type TrialFilter = "all" | SuperAdminTrialRow["status"];

function statusLabel(status: SuperAdminTrialRow["status"]) {
  if (status === "active") return "Activo";
  if (status === "converted") return "Convertido";
  return "Vencido";
}

function statusTone(status: SuperAdminTrialRow["status"]): "emerald" | "teal" | "rose" {
  if (status === "active") return "emerald";
  if (status === "converted") return "teal";
  return "rose";
}

function TrialProgress({ trial }: { trial: SuperAdminTrialRow }) {
  const pct = Math.min(100, Math.round((trial.usedDays / trial.totalDays) * 100));
  const tone = trial.remainingDays <= 5 ? "rose" : trial.remainingDays <= 10 ? "amber" : "teal";

  return (
    <div className="min-w-[150px]">
      <ProgressBar value={pct} tone={tone} />
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Dia {trial.usedDays} de {trial.totalDays}</span>
        <span className={trial.remainingDays <= 7 ? "font-semibold text-amber-700" : ""}>
          {trial.remainingDays}d restantes
        </span>
      </div>
    </div>
  );
}

export default function SuperAdminTrials({ data }: { data: SuperAdminPlatformData }) {
  const [filter, setFilter] = useState<TrialFilter>("all");

  const filtered = useMemo(
    () => data.trials.filter((trial) => filter === "all" || trial.status === filter),
    [data.trials, filter]
  );
  const active = data.trials.filter((trial) => trial.status === "active");
  const expiringSoon = active.filter((trial) => trial.remainingDays <= 7);
  const converted = data.trials.filter((trial) => trial.status === "converted");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Trials"
        description="Seguimiento de periodos de prueba calculado desde la fecha de creacion de cada clinica."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Trials activos" value={active.length} icon={Timer} tone="cyan" />
        <StatTile label="Vencen pronto" value={expiringSoon.length} sub="proximos 7 dias" icon={AlertTriangle} tone="amber" />
        <StatTile label="Convertidos" value={converted.length} icon={Zap} tone="emerald" />
      </div>

      {expiringSoon.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {expiringSoon.length} trial{expiringSoon.length === 1 ? "" : "s"} por vencer
              </p>
              <p className="text-sm text-amber-800">{expiringSoon.map((trial) => trial.clinicName).join(", ")}</p>
            </div>
          </div>
          <a
            href={`mailto:${expiringSoon[0].contactEmail}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Mail className="h-4 w-4" />
            Contactar primero
          </a>
        </section>
      )}

      <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {[
          ["all", "Todos"],
          ["active", "Activos"],
          ["converted", "Convertidos"],
          ["expired", "Vencidos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as TrialFilter)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              filter === value ? "bg-[#0e88ab] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
                <th className="px-5 py-3 font-semibold">Clinica</th>
                <th className="px-5 py-3 font-semibold">Contacto</th>
                <th className="px-5 py-3 font-semibold">Periodo</th>
                <th className="px-5 py-3 font-semibold">Progreso</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trial) => (
                <tr key={trial.clinicId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-sm font-black text-[#0e88ab]">
                        {trial.clinicName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">{trial.clinicName}</p>
                        <p className="text-xs text-slate-500">{trial.totalUsers} usuarios</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{trial.contactName}</p>
                    <p className="text-xs text-slate-500">{trial.contactEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <p>{formatDate(trial.startAt)}</p>
                    <p className="text-xs text-slate-400">{formatDate(trial.endAt)}</p>
                  </td>
                  <td className="px-5 py-4">
                    {trial.status === "active" ? (
                      <TrialProgress trial={trial} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <CheckCircle2 className="h-4 w-4" />
                        Ciclo cerrado
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={statusTone(trial.status)}>{statusLabel(trial.status)}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`mailto:${trial.contactEmail}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Contactar
                      </a>
                      <Link
                        href="/super-admin/clinicas"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver clinica
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
