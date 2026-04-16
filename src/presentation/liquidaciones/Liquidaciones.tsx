"use client";

import {
  ChevronDown,
  ChevronUp,
  Coins,
  Percent,
  RefreshCw,
  Save,
  Stethoscope,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/presentation/dashboard/shared";
import { useLiquidacionesViewModel } from "./LiquidacionesViewModel";

function StatCard({
  label,
  value,
  icon: Icon,
  emphasized = false,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border px-3 py-2.5 shadow-sm ${
        emphasized
          ? "border-[#19b3bc]/30 bg-gradient-to-br from-[#19b3bc] to-[#0f8f98] text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`max-w-[6.5rem] text-[9px] font-semibold uppercase leading-4 tracking-[0.18em] ${
            emphasized ? "text-white/75" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            emphasized ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <p
        className={`mt-2 text-[20px] font-semibold leading-none tracking-tight ${
          emphasized ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function Liquidaciones() {
  const { state, actions } = useLiquidacionesViewModel();

  if (state.roleLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-56 rounded-2xl bg-slate-200" />
          <div className="h-40 rounded-3xl bg-slate-200" />
          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!state.hasAccess) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          No tienes acceso a esta seccion. Redirigiendo...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-3">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  Liquidaciones
                </h1>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {state.clinicLabel ?? "Sede actual"}
                </span>
              </div>
              <p className="mt-1 text-[15px] text-slate-500">Pago mensual por profesional</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-col gap-1 text-sm text-slate-500">
                <input
                  type="month"
                  value={state.month}
                  onChange={(event) => actions.setMonth(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  void actions.refresh();
                }}
                disabled={state.loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[22px] border border-slate-200 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 md:flex-nowrap">
                <label className="flex min-w-[150px] flex-1 items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-medium text-slate-600">% Clínica</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={state.draftClinicPercentage}
                    onChange={(event) => actions.setDraftClinicPercentage(event.target.value)}
                    className={`h-9 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-slate-800 outline-none transition ${
                      state.clinicPercentageError
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                    }`}
                  />
                </label>

                <div className="hidden h-8 w-px bg-slate-200 md:block" />

                <label className="flex min-w-[150px] flex-1 items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-medium text-slate-600">% SII</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={state.draftSiiPercentage}
                    onChange={(event) => actions.setDraftSiiPercentage(event.target.value)}
                    className={`h-9 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-slate-800 outline-none transition ${
                      state.siiPercentageError
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                    }`}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <button
                  type="button"
                  onClick={actions.resetSettings}
                  disabled={!state.hasUnsavedChanges || state.saving}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Restablecer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void actions.saveSettings();
                  }}
                  disabled={state.saveDisabled}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#0f9ea8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b8e97] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
                >
                  <Save className="h-4 w-4" />
                  {state.saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>

            {state.saveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.saveError}
              </div>
            ) : null}
            {state.successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {state.successMessage}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {state.loading && !state.rows.length ? (
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[84px] animate-pulse rounded-[20px] border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          {state.error}
        </div>
      ) : null}

      <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Profesionales activos" value={state.summary.activeProfessionals} icon={Users} />
        <StatCard label="Sesiones liquidables" value={state.summary.sessions} icon={Stethoscope} />
        <StatCard label="Bruto total" value={formatCurrency(state.summary.grossAmount)} icon={Coins} />
        <StatCard
          label="Descuento clínica"
          value={formatCurrency(state.summary.clinicRetentionAmount)}
          icon={Percent}
        />
        <StatCard
          label="Descuento SII"
          value={formatCurrency(state.summary.siiRetentionAmount)}
          icon={Percent}
        />
        <StatCard
          label="Neto a pagar"
          value={formatCurrency(state.summary.netAmount)}
          icon={Coins}
          emphasized
        />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">
                Liquidación del mes
              </h2>
              <p className="mt-1 text-[15px] text-slate-500">
                Se consideran solo citas completadas con pago ligado a la cita en estado pagado.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-800">
              {state.summary.activeProfessionals} profesionales
            </div>
          </div>
        </div>

        {state.isEmptyMonth ? (
          <div className="border-b border-slate-200 bg-amber-50/70 px-5 py-3 text-sm text-amber-800">
            No hay liquidacion para este mes. Igualmente se muestran todos los profesionales
            activos de la sede con sus montos en cero.
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Profesional</th>
                <th className="px-4 py-3 font-semibold">Especialidad</th>
                <th className="px-4 py-3 font-semibold">Atenciones</th>
                <th className="px-4 py-3 font-semibold">Bruto</th>
                <th className="px-4 py-3 font-semibold">Desc. Clínica</th>
                <th className="px-4 py-3 font-semibold">Desc. SII</th>
                <th className="px-4 py-3 font-semibold">Neto</th>
                <th className="px-5 py-3 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => {
                const expanded = state.expandedDoctorIds.includes(row.doctorId);

                return (
                  <FragmentRow
                    key={row.doctorId}
                    row={row}
                    expanded={expanded}
                    onToggle={() => actions.toggleDoctor(row.doctorId)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FragmentRow({
  row,
  expanded,
  onToggle,
}: {
  row: ReturnType<typeof useLiquidacionesViewModel>["state"]["rows"][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const initial = row.name.charAt(0).toUpperCase();

  return (
    <>
      <tr className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70">
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9f6f4] text-sm font-semibold text-[#0f9ea8]">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-5 text-slate-900">{row.name}</div>
              <div className="text-[13px] leading-4 text-slate-500">
                {row.treatments.length} tratamientos
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-[15px] text-slate-600">{row.specialty || "Sin especialidad"}</td>
        <td className="px-4 py-3 text-[15px] font-semibold text-slate-900">{row.sessionCount}</td>
        <td className="px-4 py-3 text-[15px] font-semibold text-slate-900">{formatCurrency(row.grossAmount)}</td>
        <td className="px-4 py-3 text-[15px] text-slate-600">-{formatCurrency(row.clinicRetentionAmount).replace(/^-/, "")}</td>
        <td className="px-4 py-3 text-[15px] text-slate-600">-{formatCurrency(row.siiRetentionAmount).replace(/^-/, "")}</td>
        <td className="px-4 py-3 text-[15px] font-semibold text-[#0f9ea8]">{formatCurrency(row.netAmount)}</td>
        <td className="px-5 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            {expanded ? "Ocultar" : "Ver detalle"}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={8} className="px-5 py-3">
            {row.treatments.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Tratamiento</th>
                      <th className="px-4 py-2.5 font-semibold">Sesiones</th>
                      <th className="px-4 py-2.5 font-semibold">Bruto acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.treatments.map((treatment) => (
                      <tr key={treatment.treatmentId} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{treatment.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{treatment.sessionCount}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {formatCurrency(treatment.grossAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                Este profesional no tiene sesiones liquidables en el mes seleccionado.
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
