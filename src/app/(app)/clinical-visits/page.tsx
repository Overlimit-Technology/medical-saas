"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Patient = { id: string; firstName: string; lastName: string };
type Appointment = {
  id: string;
  startAt: string;
  status: string;
  patient: { id: string; firstName: string; lastName: string };
  box: { name: string };
};

type ClinicalVisit = {
  id: string;
  startedAt: string;
  patient: { id: string; firstName: string; lastName: string };
  appointment?: { id: string; startAt: string } | null;
};
function ClinicalVisitPageContent() {
  const searchParams = useSearchParams();
  const qsAppointmentId = searchParams.get("appointmentId");
  const qsPatientId = searchParams.get("patientId");

  const [role, setRole] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [patientId, setPatientId] = useState(qsPatientId ?? "");
  const [appointmentId, setAppointmentId] = useState(qsAppointmentId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.ok) setRole(data.session?.role ?? null);
      } catch {
        setRole(null);
      }
    };
    loadSession();

    const loadPatients = async () => {
      const res = await fetch("/api/patients?pageSize=200");
      const data = await res.json();
      if (data.ok) setPatients(data.items ?? []);
    };

    const loadAppointments = async () => {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
      const data = await res.json();
      if (data.ok) setAppointments(data.items ?? []);
    };

    const loadVisits = async () => {
      const res = await fetch("/api/clinical-visits");
      const data = await res.json();
      if (data.ok) setVisits(data.items ?? []);
    };

    loadPatients();
    loadAppointments();
    loadVisits();
  }, []);

  useEffect(() => {
    if (!qsPatientId) return;
    setPatientId(qsPatientId);
  }, [qsPatientId]);

  useEffect(() => {
    if (!qsAppointmentId) return;
    setAppointmentId(qsAppointmentId);
  }, [qsAppointmentId]);

  const filteredAppointments = useMemo(() => {
    if (!patientId) return appointments;
    return appointments.filter((appt) => appt.patient.id === patientId);
  }, [appointments, patientId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (role !== "DOCTOR") {
      setError("Solo el rol Doctor puede iniciar una cita clínica.");
      return;
    }
    if (!patientId) {
      setError("Debes seleccionar un paciente para iniciar la cita clínica.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/clinical-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        appointmentId: appointmentId || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error ?? "No se pudo iniciar la cita clínica.");
      return;
    }

    setSuccess("Cita clínica iniciada y registrada.");
    setVisits((prev) => [data.item, ...prev]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">.....</p>
            <h1 className="text-2xl font-semibold text-slate-900">Iniciar cita clínica</h1>
            <p className="text-sm text-slate-500">
              Selecciona un paciente y, opcionalmente, vincula una cita agendada vigente.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Solo Doctor
          </span>
        </div>

        {role && role !== "DOCTOR" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta funcionalidad es exclusiva para el rol Doctor. Inicia sesión como doctor para continuar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Paciente</label>
            <select
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un paciente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Cita agendada (opcional)</label>
              <span className="text-xs text-slate-400">Se filtrarán por paciente seleccionado</span>
            </div>
            <select
              value={appointmentId}
              onChange={(event) => setAppointmentId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Sin cita del calendario</option>
              {filteredAppointments.map((appt) => (
                <option key={appt.id} value={appt.id}>
                  {new Date(appt.startAt).toLocaleString("es-CL")} · {appt.patient.firstName} {appt.patient.lastName} ·{" "}
                  Box {appt.box.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Trazabilidad</p>
            <p className="mt-1">
              Se registrará usuario autenticado, fecha/hora de inicio, paciente y la cita agendada (si se selecciona).
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Registrando..." : "Iniciar cita clínica"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Actividad reciente</h2>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {visits.length} registros
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {visits.length === 0 && (
            <p className="text-sm text-slate-500">Aún no hay citas clínicas registradas.</p>
          )}
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">
                  {visit.patient.firstName} {visit.patient.lastName}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(visit.startedAt).toLocaleString("es-CL")}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {visit.appointment ? `Vinculada a cita ${visit.appointment.id}` : "Sin cita agendada"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClinicalVisitPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando cita clinica...</div>}>
      <ClinicalVisitPageContent />
    </Suspense>
  );
}
