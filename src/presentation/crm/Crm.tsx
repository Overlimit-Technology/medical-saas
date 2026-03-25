"use client";

import { useCrmViewModel, STATUS_LABEL, formatDateLabel, formatClp, fullName, type FormState } from "./CrmViewModel";

export default function Crm() {
  const { state, actions } = useCrmViewModel();

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando Gestion de contactos y cobros...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Gestion de contactos y cobros</p>
            <h1 className="text-2xl font-semibold text-slate-900">Gestion de contactos y cobros</h1>
            {state.selectedPatient && (
              <p className="mt-2 text-sm text-slate-600">
                Cobros y pagos del paciente <span className="font-semibold">{fullName(state.selectedPatient)}</span> - RUN{" "}
                <span className="font-semibold">{state.selectedPatient.run}</span>
              </p>
            )}
          </div>
          <div className="w-full max-w-sm">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Paciente</label>
            <select value={state.selectedPatientId} onChange={(e) => actions.setSelectedPatientId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {state.patients.length === 0 && <option value="">Sin pacientes</option>}
              {state.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{fullName(patient)} - {patient.run}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">FECHA</th>
                <th className="px-2 py-2 font-medium">TRATAMIENTO</th>
                <th className="px-2 py-2 font-medium">PRECIO</th>
                <th className="px-2 py-2 font-medium">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {state.historyLoading && (
                <tr><td colSpan={4} className="px-2 py-4 text-slate-400">Cargando historial...</td></tr>
              )}
              {!state.historyLoading && state.history.length === 0 && (
                <tr><td colSpan={4} className="px-2 py-4 text-slate-400">Sin registros de cobros/pagos para este paciente.</td></tr>
              )}
              {!state.historyLoading && state.history.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-2 py-3 text-slate-700">{formatDateLabel(row.recordedAt)}</td>
                  <td className="px-2 py-3 font-medium text-slate-900">{row.treatment.name}</td>
                  <td className="px-2 py-3 text-slate-700">{formatClp(row.amount)}</td>
                  <td className="px-2 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "PAID" ? "bg-emerald-50 text-emerald-700" : row.status === "WAIVED" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700"}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registrar cobro</h2>
        <form onSubmit={actions.handleSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Tratamiento</label>
            <select value={state.form.treatmentId} onChange={(e) => actions.handleTreatmentChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {state.treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Fecha</label>
            <input type="date" value={state.form.recordedAt} onChange={(e) => actions.handleFormChange("recordedAt", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Estado</label>
            <select value={state.form.status} onChange={(e) => actions.handleFormChange("status", e.target.value as FormState["status"])} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagado</option>
              <option value="WAIVED">Exento</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Monto (CLP)</label>
            <input type="number" min={1} step="1" value={state.form.amount} onChange={(e) => actions.handleFormChange("amount", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={state.currentTreatment ? `${Math.round(state.currentTreatment.price)}` : "0"} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Notas (opcional)</label>
            <input type="text" value={state.form.notes} maxLength={250} onChange={(e) => actions.handleFormChange("notes", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Detalle breve del cobro" />
          </div>
          <div className="md:col-span-1 md:self-end">
            <button type="submit" disabled={state.saving || !state.selectedPatientId || !state.form.treatmentId} className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {state.saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
        {state.error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</div>
        )}
      </div>

      {state.successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}
    </div>
  );
}
