"use client";

import { Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Clock, DoorOpen, Play, ShieldCheck } from "lucide-react";
import { useClinicalVisitsViewModel } from "./ClinicalVisitsViewModel";
import { Card, EmptyState, Loading, Notice, PageHead, StatusPill, View, btnClass, zs } from "@/presentation/ui/zs";

const dateBlock = (iso: string) => {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
    day: d.getDate(),
    month: d.toLocaleDateString("es-CL", { month: "short" }).replace(".", ""),
    time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
};
const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function ClinicalVisitPageContent() {
  const { state, actions } = useClinicalVisitsViewModel();
  const formRef = useRef<HTMLDivElement>(null);
  const isDoctor = state.role === "DOCTOR";

  // Proximas citas del profesional (las propias si se conoce la sesion), sin las canceladas.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return state.filteredAppointments
      .filter((a) => a.status !== "CANCELLED" && a.status !== "COMPLETED" && new Date(a.endAt).getTime() >= now)
      .filter((a) => !state.userId || a.doctorId === state.userId)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 8);
  }, [state.filteredAppointments, state.userId]);

  const prefill = (patientId: string, appointmentId: string) => {
    actions.setPatientId(patientId);
    actions.setAppointmentId(appointmentId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <View label="Cita clínica" wide>
      <PageHead
        tag="Cita clínica"
        title="Atiende a"
        accent="tu próximo paciente"
        lead="Elige una cita de tu agenda o un paciente y empieza la atención."
        actions={<StatusPill tone="ok">Solo profesionales</StatusPill>}
      />

      {state.role && !isDoctor ? (
        <Notice tone="err">Esta sección es solo para profesionales. Ingresa con tu cuenta de profesional para atender.</Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Tus próximas citas" action={<Link className={zs.link} href="/agenda">Ver agenda <ArrowRight className="h-4 w-4" /></Link>}>
            {upcoming.length ? (
              <ul className="flex flex-col">
                {upcoming.map((a) => {
                  const d = dateBlock(a.startAt);
                  const selected = state.appointmentId === a.id;
                  return (
                    <li key={a.id} className="flex items-center gap-4 border-t border-slate-200 py-3.5 first:border-t-0 first:pt-0">
                      <div
                        className={`w-[64px] shrink-0 rounded-[18px] pb-2.5 pt-2 text-center ${
                          a.status === "CONFIRMED" ? "border border-[#50c9d5]/30 bg-[#50c9d5]/[0.08] text-slate-900" : "bg-[#50c9d5] text-[#080b04]"
                        }`}
                      >
                        <small className="block text-[11px] font-semibold uppercase tracking-[0.1em]">{d.weekday}</small>
                        <b className="block font-display text-[26px] font-bold leading-none tracking-[-1px]">{d.day}</b>
                        <span className="block text-[12px] font-medium">{d.month}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate font-display text-[16px] font-semibold text-slate-900">
                          {a.patient.firstName} {a.patient.lastName}
                        </b>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {d.time}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <DoorOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {a.box.name}
                          </span>
                          {a.treatmentPlan ? <span>{a.treatmentPlan.name}</span> : null}
                        </span>
                      </div>
                      <StatusPill tone={a.status === "CONFIRMED" ? "ok" : "warn"}>
                        {a.status === "CONFIRMED" ? "Confirmada" : "Por confirmar"}
                      </StatusPill>
                      <button
                        type="button"
                        onClick={() => prefill(a.patient.id, a.id)}
                        disabled={!isDoctor}
                        className={btnClass(selected ? "primary" : "ghost", "sm")}
                      >
                        <Play className="h-3.5 w-3.5" strokeWidth={2} />
                        {selected ? "Elegida" : "Atender"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No tienes citas próximas">Las citas de los próximos 30 días aparecerán aquí.</EmptyState>
            )}
          </Card>

          <div ref={formRef} className="scroll-mt-6">
            <Card title="Iniciar la atención">
              <form onSubmit={actions.handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-900">Paciente</span>
                    <select value={state.patientId} onChange={(e) => actions.setPatientId(e.target.value)} className={zs.input}>
                      <option value="">Elige un paciente</option>
                      {state.patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-900">Cita agendada (opcional)</span>
                    <select value={state.appointmentId} onChange={(e) => actions.setAppointmentId(e.target.value)} className={zs.input}>
                      <option value="">Sin cita de la agenda</option>
                      {state.filteredAppointments.map((appt) => (
                        <option key={appt.id} value={appt.id}>
                          {shortDateTime(appt.startAt)} · {appt.patient.firstName} {appt.patient.lastName} · {appt.box.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <Notice icon={ShieldCheck}>Queda registrado quién atiende, a qué hora empieza, el paciente y la cita vinculada.</Notice>

                {state.error ? <Notice tone="err">{state.error}</Notice> : null}
                {state.success ? <Notice>{state.success}</Notice> : null}

                <div>
                  <button type="submit" disabled={state.loading || !isDoctor} className={btnClass("primary")}>
                    <Play className="h-4 w-4" strokeWidth={2} />
                    {state.loading ? "Iniciando…" : "Iniciar atención"}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        <Card title={<>Actividad reciente <StatusPill tone="off">{state.visits.length} registros</StatusPill></>}>
          {state.visits.length ? (
            <ul className="flex flex-col">
              {state.visits.slice(0, 12).map((visit) => (
                <li key={visit.id} className="flex items-center gap-3 border-t border-slate-200 py-3 first:border-t-0 first:pt-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-xs font-bold text-slate-900">
                    {visit.patient.firstName.charAt(0)}
                    {visit.patient.lastName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-display text-[14.5px] font-semibold text-slate-900">
                      {visit.patient.firstName} {visit.patient.lastName}
                    </b>
                    <span className="block text-[12.5px] text-slate-500">
                      Atendido el {shortDateTime(visit.startedAt)}
                      {visit.appointment ? ` · cita del ${shortDateTime(visit.appointment.startAt)}` : " · sin cita agendada"}
                    </span>
                  </div>
                  <Link href={`/patients/${visit.patient.id}`} className={btnClass("quiet", "sm")}>
                    Ficha
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aún no hay atenciones">Cuando inicies una, aparecerá aquí con su paciente.</EmptyState>
          )}
        </Card>
      </div>
    </View>
  );
}

export default function ClinicalVisits() {
  return (
    <Suspense fallback={<Loading label="Cargando cita clínica…" />}>
      <ClinicalVisitPageContent />
    </Suspense>
  );
}
