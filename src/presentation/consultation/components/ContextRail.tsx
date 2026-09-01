"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  FileText,
  HeartPulse,
  Layers,
  Phone,
  Receipt,
  TriangleAlert,
} from "lucide-react";
import type { ConsultationBootstrap } from "@/domain/consultations/entities/Consultation";
import { formatCurrency, formatDateTime, formatRelative } from "../consultation.utils";

type Props = {
  bootstrap: ConsultationBootstrap;
};

function RailSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: typeof Layers;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Icon size={14} className="shrink-0 text-[#19b3bc]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </span>
        {badge !== undefined && (
          <span className="rounded-full bg-[#19b3bc]/10 px-2 py-0.5 text-[10px] font-bold text-[#0f8f98]">
            {badge}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && <div className="animate-slide-down overflow-hidden px-4 pb-4">{children}</div>}
    </section>
  );
}

/**
 * Columna de contexto: lo que el profesional necesita tener a la vista sin
 * salir de la etapa en la que esta trabajando.
 */
export default function ContextRail({ bootstrap }: Props) {
  const { patient, history, appointment } = bootstrap;
  const allergies = history.carriedAllergies?.trim();
  const lastVisit = history.timeline[0];

  return (
    <aside className="flex flex-col gap-3">
      {allergies && (
        <div className="animate-rise-in rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700">
            <TriangleAlert size={13} /> Alergias
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-rose-800">{allergies}</p>
        </div>
      )}

      <RailSection title="Paciente" icon={HeartPulse}>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-slate-400">RUN</dt>
            <dd className="font-medium tabular-nums text-slate-700">{patient.run}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-slate-400">Edad</dt>
            <dd className="font-medium text-slate-700">
              {patient.age !== null ? `${patient.age} anos` : "Sin registro"}
            </dd>
          </div>
          {patient.gender && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-slate-400">Sexo</dt>
              <dd className="font-medium text-slate-700">{patient.gender}</dd>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-slate-400">Telefono</dt>
              <dd className="font-medium tabular-nums text-slate-700">{patient.phone}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-slate-400">Atenciones</dt>
            <dd className="font-medium text-slate-700">{history.totalVisits}</dd>
          </div>
        </dl>

        {patient.emergencyContactName && (
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <Phone size={10} /> Contacto de emergencia
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {patient.emergencyContactName}
            </p>
            {patient.emergencyContactPhone && (
              <p className="text-xs tabular-nums text-slate-500">
                {patient.emergencyContactPhone}
              </p>
            )}
          </div>
        )}
      </RailSection>

      {history.carriedMedication?.trim() && (
        <RailSection title="Medicacion actual" icon={AlertTriangle} defaultOpen={false}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {history.carriedMedication}
          </p>
        </RailSection>
      )}

      {history.timeline.length > 0 && (
        <RailSection title="Consultas previas" icon={Layers} badge={history.totalVisits}>
          <ol className="relative space-y-3 border-l border-slate-100 pl-4">
            {history.timeline.map((entry, index) => (
              <li
                key={entry.id}
                className="animate-rise-in relative"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${
                    index === 0 ? "bg-[#19b3bc]" : "bg-slate-300"
                  }`}
                />
                <p className="text-xs font-semibold text-slate-600">
                  {formatRelative(entry.startedAt)}
                  <span className="ml-1.5 font-normal text-slate-300">
                    {formatDateTime(entry.startedAt)}
                  </span>
                </p>
                {entry.diagnosis ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{entry.diagnosis}</p>
                ) : entry.chiefComplaint ? (
                  <p className="mt-0.5 line-clamp-2 text-sm italic text-slate-500">
                    {entry.chiefComplaint}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-300">Sin registro clinico</p>
                )}
                <p className="mt-0.5 text-[11px] text-slate-400">{entry.doctorName}</p>
              </li>
            ))}
          </ol>

          {lastVisit?.indications && (
            <div className="mt-3 rounded-xl border border-[#19b3bc]/15 bg-[#19b3bc]/[0.04] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0f8f98]">
                Indicaciones de la vez anterior
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                {lastVisit.indications}
              </p>
            </div>
          )}
        </RailSection>
      )}

      {history.plans.length > 0 && (
        <RailSection title="Planes de tratamiento" icon={Layers} badge={history.plans.length}>
          <ul className="space-y-2.5">
            {history.plans.map((plan) => {
              const percent =
                plan.totalSessions > 0
                  ? Math.round((plan.completedSessions / plan.totalSessions) * 100)
                  : 0;

              return (
                <li key={plan.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {plan.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        plan.status === "ACTIVE"
                          ? "bg-[#19b3bc]/15 text-[#0f8f98]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {plan.status === "ACTIVE" ? "Activo" : "Cerrado"}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#19b3bc] transition-[width] duration-700 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {plan.completedSessions} de {plan.totalSessions} sesiones
                    {plan.nextSessionAt ? ` · proxima ${formatDateTime(plan.nextSessionAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </RailSection>
      )}

      {history.upcomingAppointments.length > 0 && (
        <RailSection
          title="Proximas citas"
          icon={CalendarClock}
          badge={history.upcomingAppointments.length}
          defaultOpen={false}
        >
          <ul className="space-y-2">
            {history.upcomingAppointments.map((item) => (
              <li key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-700">{formatDateTime(item.startAt)}</p>
                <p className="text-[11px] text-slate-400">
                  {item.doctorName} · {item.boxName}
                </p>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {history.treatments.length > 0 && (
        <RailSection title="Tratamientos y cobros" icon={Receipt} defaultOpen={false}>
          <ul className="space-y-2">
            {history.treatments.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-3 border-b border-slate-50 pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{item.name}</p>
                  <p className="text-[11px] text-slate-400">{formatRelative(item.performedAt)}</p>
                </div>
                {item.amount !== null && (
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      item.paymentStatus === "PAID" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {history.records.length > 0 && (
        <RailSection
          title="Fichas del paciente"
          icon={FileText}
          badge={history.records.length}
          defaultOpen={false}
        >
          <ul className="space-y-2">
            {history.records.map((record) => (
              <li key={record.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-medium text-slate-700">
                    {record.templateName}
                  </p>
                  {record.belongsToThisAppointment && (
                    <span className="shrink-0 rounded-full bg-[#19b3bc]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#0f8f98]">
                      Hoy
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {formatRelative(record.createdAt)} · {record.doctorName}
                </p>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {appointment.notes?.trim() && (
        <RailSection title="Nota de la agenda" icon={FileText} defaultOpen={false}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {appointment.notes}
          </p>
        </RailSection>
      )}
    </aside>
  );
}
