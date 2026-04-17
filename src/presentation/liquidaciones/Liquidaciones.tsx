"use client";

import {
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  Mail,
  Percent,
  RefreshCw,
  Save,
  Stethoscope,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/presentation/dashboard/shared";
import { useLiquidacionesViewModel } from "./LiquidacionesViewModel";

function SummaryMetric({
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
      className={`flex min-w-0 items-start justify-between gap-3 px-4 py-3 ${
        emphasized ? "bg-[#f2fbfb]" : "bg-white"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p
          className={`mt-1.5 truncate text-[18px] font-semibold leading-none tracking-tight ${
            emphasized ? "text-[#0f9ea8]" : "text-slate-900"
          }`}
        >
          {value}
        </p>
      </div>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          emphasized ? "bg-[#0f9ea8]/10 text-[#0f9ea8]" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function InlineFeedback({
  tone,
  message,
}: {
  tone: "success" | "warning" | "error";
  message: string;
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-xl border px-3 py-2 text-[12px] ${toneClasses}`}>{message}</div>
  );
}

export default function Liquidaciones() {
  const { state, actions } = useLiquidacionesViewModel();

  if (state.roleLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="space-y-3 animate-pulse">
          <div className="h-28 rounded-[22px] bg-slate-200" />
          <div className="h-24 rounded-[22px] bg-slate-200" />
          <div className="h-[420px] rounded-[22px] bg-slate-200" />
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-2.5">
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">
                  Liquidaciones
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#eef7f7] px-2.5 py-1 text-[12px] font-medium text-[#0f9ea8]">
                  {state.clinicLabel ?? "Sede actual"}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">Pago mensual por profesional</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex flex-col gap-1 text-sm text-slate-500">
                <input
                  type="month"
                  value={state.month}
                  onChange={(event) => actions.setMonth(event.target.value)}
                  className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-700 outline-none transition focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  void actions.refresh();
                }}
                disabled={state.loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={actions.exportToExcel}
                disabled={state.loading || !state.rows.length}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  void actions.sendEmails();
                }}
                disabled={state.loading || state.sendingEmails || !state.rows.length}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0f9ea8] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45 whitespace-nowrap"
              >
                <Mail className="h-4 w-4" />
                {state.sendingEmails ? "Enviando..." : "Enviar boletas al correo"}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-3.5 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                  <label className="flex items-center gap-2.5 text-[12px] font-medium text-slate-500">
                    <span className="whitespace-nowrap">% Clínica</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={state.draftClinicPercentage}
                      onChange={(event) => actions.setDraftClinicPercentage(event.target.value)}
                      className={`h-8 w-24 rounded-lg border bg-white px-2.5 text-[13px] text-slate-800 outline-none transition ${
                        state.clinicPercentageError
                          ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          : "border-slate-200 focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                      }`}
                    />
                  </label>

                  <div className="hidden h-6 w-px bg-slate-200 lg:block" />

                  <label className="flex items-center gap-2.5 text-[12px] font-medium text-slate-500">
                    <span className="whitespace-nowrap">% SII</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={state.draftSiiPercentage}
                      onChange={(event) => actions.setDraftSiiPercentage(event.target.value)}
                      className={`h-8 w-24 rounded-lg border bg-white px-2.5 text-[13px] text-slate-800 outline-none transition ${
                        state.siiPercentageError
                          ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          : "border-slate-200 focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
                      }`}
                    />
                  </label>
                </div>

                <p className="text-[12px] leading-5 text-slate-500">
                  Los descuentos se recalculan en pantalla al instante y solo se persisten al
                  guardar.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={actions.resetSettings}
                  disabled={!state.hasUnsavedChanges || state.saving}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Restablecer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void actions.saveSettings();
                  }}
                  disabled={state.saveDisabled}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f9ea8] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
                >
                  <Save className="h-3.5 w-3.5" />
                  {state.saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>

            {state.saveError || state.successMessage || state.emailFeedback ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {state.saveError ? (
                  <InlineFeedback tone="error" message={state.saveError} />
                ) : null}
                {state.successMessage ? (
                  <InlineFeedback tone="success" message={state.successMessage} />
                ) : null}
                {state.emailFeedback ? (
                  <InlineFeedback
                    tone={state.emailFeedback.kind}
                    message={state.emailFeedback.message}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {state.loading && !state.rows.length ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[76px] animate-pulse bg-white" />
            ))}
          </div>
        </section>
      ) : null}

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 shadow-sm">
          {state.error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          <SummaryMetric
            label="Profesionales"
            value={state.summary.activeProfessionals}
            icon={Users}
          />
          <SummaryMetric
            label="Sesiones"
            value={state.summary.sessions}
            icon={Stethoscope}
          />
          <SummaryMetric
            label="Bruto"
            value={formatCurrency(state.summary.grossAmount)}
            icon={Coins}
          />
          <SummaryMetric
            label="Clínica"
            value={formatCurrency(state.summary.clinicRetentionAmount)}
            icon={Percent}
          />
          <SummaryMetric
            label="SII"
            value={formatCurrency(state.summary.siiRetentionAmount)}
            icon={Percent}
          />
          <SummaryMetric
            label="Neto"
            value={formatCurrency(state.summary.netAmount)}
            icon={Coins}
            emphasized
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">
                Liquidación del mes
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Solo considera citas con pago ligado a la cita en estado pagado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                {state.currentMonthLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                {state.summary.activeProfessionals} profesionales
              </span>
            </div>
          </div>
        </div>

        {state.isEmptyMonth ? (
          <div className="border-b border-slate-200 bg-amber-50/70 px-5 py-2.5 text-[12px] text-amber-800">
            No hay liquidación para este mes. Se muestran igualmente todos los profesionales
            activos de la sede con montos en cero.
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Profesional</th>
                <th className="px-4 py-2.5 font-semibold">Especialidad</th>
                <th className="px-4 py-2.5 font-semibold">Atenciones</th>
                <th className="px-4 py-2.5 font-semibold">Bruto</th>
                <th className="px-4 py-2.5 font-semibold">Desc. Clínica</th>
                <th className="px-4 py-2.5 font-semibold">Desc. SII</th>
                <th className="px-4 py-2.5 font-semibold">Neto</th>
                <th className="px-5 py-2.5 font-semibold text-right">Detalle</th>
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
        <td className="px-5 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d9f6f4] text-[11px] font-semibold text-[#0f9ea8]">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-5 text-slate-900">
                {row.name}
              </div>
              <div className="text-[12px] leading-4 text-slate-500">
                {row.treatments.length} tratamientos
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-[13px] text-slate-600">
          {row.specialty || "Sin especialidad"}
        </td>
        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">{row.sessionCount}</td>
        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
          {formatCurrency(row.grossAmount)}
        </td>
        <td className="px-4 py-2.5 text-[13px] text-slate-600">
          -{formatCurrency(row.clinicRetentionAmount).replace(/^-/, "")}
        </td>
        <td className="px-4 py-2.5 text-[13px] text-slate-600">
          -{formatCurrency(row.siiRetentionAmount).replace(/^-/, "")}
        </td>
        <td className="px-4 py-2.5 text-[13px] font-semibold text-[#0f9ea8]">
          {formatCurrency(row.netAmount)}
        </td>
        <td className="px-5 py-2.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            {expanded ? "Ocultar" : "Ver detalle"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={8} className="px-5 py-3">
            {row.treatments.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Tratamiento</th>
                      <th className="px-4 py-2 font-semibold">Sesiones</th>
                      <th className="px-4 py-2 font-semibold">Bruto acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.treatments.map((treatment) => (
                      <tr key={treatment.treatmentId} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-[13px] font-medium text-slate-800">
                          {treatment.name}
                        </td>
                        <td className="px-4 py-2 text-[13px] text-slate-600">
                          {treatment.sessionCount}
                        </td>
                        <td className="px-4 py-2 text-[13px] font-medium text-slate-900">
                          {formatCurrency(treatment.grossAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-[12px] text-slate-500">
                Este profesional no tiene sesiones liquidables en el mes seleccionado.
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
