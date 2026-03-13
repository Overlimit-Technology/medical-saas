"use client";

import { Suspense } from "react";
import { useClinicalVisitsViewModel } from "./ClinicalVisitsViewModel";

function ClinicalVisitPageContent() {
  const { state, actions } = useClinicalVisitsViewModel();

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">.....</p>
            <h1 className="text-2xl font-semibold text-slate-900">Iniciar cita clínica</h1>
            <p className="text-sm text-slate-500">Selecciona un paciente y, opcionalmente, vincula una cita agendada vigente.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Solo Doctor</span>
        </div>

        {state.role && state.role !== "DOCTOR" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta funcionalidad es exclusiva para el rol Doctor. Inicia sesión como doctor para continuar.
          </div>
        )}

        <form onSubmit={actions.handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Paciente</label>
            <select value={state.patientId} onChange={(e) => actions.setPatientId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Selecciona un paciente</option>
              {state.patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Cita agendada (opcional)</label>
              <span className="text-xs text-slate-400">Se filtrarán por paciente seleccionado</span>
            </div>
            <select value={state.appointmentId} onChange={(e) => actions.setAppointmentId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Sin cita del calendario</option>
              {state.filteredAppointments.map((appt) => (
                <option key={appt.id} value={appt.id}>
                  {new Date(appt.startAt).toLocaleString("es-CL")} · {appt.patient.firstName} {appt.patient.lastName} · Box {appt.box.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Trazabilidad</p>
            <p className="mt-1">Se registrará usuario autenticado, fecha/hora de inicio, paciente y la cita agendada (si se selecciona).</p>
          </div>

          {state.error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</div>}
          {state.success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</div>}

          <button type="submit" disabled={state.loading} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400">
            {state.loading ? "Registrando..." : "Iniciar cita clínica"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Actividad reciente</h2>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{state.visits.length} registros</span>
        </div>

        <div className="mt-4 space-y-3">
          {state.visits.length === 0 && <p className="text-sm text-slate-500">Aún no hay citas clínicas registradas.</p>}
          {state.visits.map((visit) => (
            <div key={visit.id} className="rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{visit.patient.firstName} {visit.patient.lastName}</div>
                <div className="text-xs text-slate-500">{new Date(visit.startedAt).toLocaleString("es-CL")}</div>
              </div>
              <div className="text-xs text-slate-500">{visit.appointment ? `Vinculada a cita ${visit.appointment.id}` : "Sin cita agendada"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClinicalVisits() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando cita clinica...</div>}>
      <ClinicalVisitPageContent />
    </Suspense>
  );
}
