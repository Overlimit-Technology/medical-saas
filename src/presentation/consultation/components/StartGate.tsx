"use client";

import { useState } from "react";
import {
  BadgeCheck,
  FileSignature,
  CalendarDays,
  DoorOpen,
  Layers,
  Loader2,
  MapPin,
  Play,
  Timer,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type { ConsultationBootstrap } from "@/domain/consultations/entities/Consultation";
import { formatDate, formatRelative, formatTime } from "../consultation.utils";
import AttentionTypePicker, { type PickerType } from "./AttentionTypePicker";

type Props = {
  bootstrap: ConsultationBootstrap;
  canWrite: boolean;
  starting: boolean;
  isAdmin?: boolean;
  onStart: (attentionTypeKey: string, consentSigner: string | null) => void;
};

const CONSENT_TEXT =
  "El paciente fue informado sobre su estado de salud, la atencion que se le realizara, sus objetivos, alternativas y riesgos, y acepta recibirla. Sus datos clinicos se guardan cifrados y solo los ve el equipo que lo atiende (Ley 20.584).";

function ArrivalChip({ bootstrap }: Pick<Props, "bootstrap">) {
  const { arrivedAt, delayMinutes } = bootstrap.appointment;

  if (arrivedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <DoorOpen size={13} /> En sala desde {formatTime(arrivedAt)}
      </span>
    );
  }

  if (delayMinutes) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <Timer size={13} /> Avisa {delayMinutes} min de demora
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
      <Timer size={13} /> Sin registro de llegada
    </span>
  );
}

/**
 * Antesala de la consulta. Muestra a quien se va a atender y por que, para que
 * abrir el encuentro sea una decision informada y no un clic mas.
 */
export default function StartGate(props: Props) {
  const { bootstrap, canWrite, starting, onStart, isAdmin } = props;
  const { patient, appointment, history } = bootstrap;
  const [types, setTypes] = useState<PickerType[]>(bootstrap.attention.types);
  const [selectedKey, setSelectedKey] = useState<string | null>(bootstrap.attention.suggestedKey);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signer, setSigner] = useState(patient.fullName);
  const [showConsent, setShowConsent] = useState(false);
  const selectedType = types.find((type) => type.key === selectedKey) ?? null;
  const needsConsent = !bootstrap.consent;
  const canStart = Boolean(selectedType) && (!needsConsent || (consentChecked && signer.trim().length >= 2));
  const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
  const lastVisit = history.timeline[0];
  const isCancelled = appointment.status === "CANCELLED";
  const isFinished = appointment.status === "COMPLETED" || appointment.status === "NO_SHOW";

  return (
    <div className="animate-rise-in mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-900/5">
        <div className="relative bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] px-8 py-9 text-white">
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur-sm ring-1 ring-white/25">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">
                Consulta clinica
              </p>
              <h1 className="mt-1 truncate text-3xl font-semibold">{patient.fullName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={14} />
                  {patient.age !== null ? `${patient.age} anos` : "Edad sin registro"}
                </span>
                <span className="tabular-nums">RUN {patient.run}</span>
                {patient.gender && <span>{patient.gender}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-7">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: CalendarDays,
                label: "Hoy",
                value: `${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`,
                caption: formatDate(appointment.startAt),
              },
              {
                icon: MapPin,
                label: "Box",
                value: appointment.boxName,
                caption: appointment.doctorName,
              },
              {
                icon: Layers,
                label: "Sesion",
                value: appointment.treatmentPlan
                  ? `${appointment.treatmentPlan.sessionIndex ?? "?"} de ${appointment.treatmentPlan.totalSessions}`
                  : "Atencion puntual",
                caption: appointment.treatmentPlan?.name ?? "Sin plan asociado",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className="animate-rise-in rounded-2xl bg-slate-50 px-4 py-3.5"
                style={{ animationDelay: `${80 + index * 60}ms` }}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <item.icon size={11} /> {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{item.value}</p>
                <p className="truncate text-xs text-slate-400">{item.caption}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ArrivalChip bootstrap={bootstrap} />
            {history.totalVisits > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                <BadgeCheck size={13} /> {history.totalVisits} atenciones previas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#50c9d5]/10 px-3 py-1 text-xs font-semibold text-[#1e737b]">
                <BadgeCheck size={13} /> Primera atencion
              </span>
            )}
          </div>

          {history.carriedAllergies?.trim() && (
            <div className="animate-rise-in mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700">
                <TriangleAlert size={13} /> Alergias registradas
              </p>
              <p className="mt-1 text-sm text-rose-800">{history.carriedAllergies}</p>
            </div>
          )}

          {lastVisit && (
            <div className="mt-4 rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Ultima consulta · {formatRelative(lastVisit.startedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {lastVisit.diagnosis ?? lastVisit.chiefComplaint ?? "Sin registro clinico"}
              </p>
            </div>
          )}

          {isCancelled ? (
            <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Esta cita esta cancelada. Reagendala desde la agenda para poder atenderla.
            </p>
          ) : !canWrite ? (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Solo el profesional que atiende puede iniciar la consulta. Estas viendo la ficha en
              modo lectura.
            </p>
          ) : (
            <>
              {isFinished && (
                <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Esta cita ya figura como cerrada. Si necesitas complementarla, al iniciar se
                  abrira una nueva consulta sobre la misma cita.
                </p>
              )}

              {appointment.notes?.trim() && appointment.notes.trim() !== "[demo]" && (
                <div className="mt-5 rounded-2xl border border-slate-100 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Motivo al agendar</p>
                  <p className="mt-1 text-sm text-slate-700">{appointment.notes}</p>
                </div>
              )}

              <div className="mt-7">
                <AttentionTypePicker
                  types={types}
                  selectedKey={selectedKey}
                  suggestedKey={bootstrap.attention.suggestedKey}
                  preselectedKey={bootstrap.attention.preselectedKey}
                  canManage={canWrite}
                  canShare={Boolean(isAdmin)}
                  onSelect={setSelectedKey}
                  onTypesChange={setTypes}
                />
              </div>

              {needsConsent ? (
                <div className={`mt-6 rounded-2xl border p-4 transition-colors ${consentChecked ? "border-[#50c9d5]/50 bg-[#50c9d5]/5" : "border-amber-200 bg-amber-50/60"}`}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-[#50c9d5]" />
                    <span className="flex-1 text-sm text-slate-700">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <FileSignature size={14} /> Consentimiento informado
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Primera atencion con registro de consentimiento. Queda guardado con fecha, texto y quien lo registro.{" "}
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowConsent((v) => !v); }} className="font-semibold text-[#1e737b] hover:underline">
                          {showConsent ? "Ocultar texto" : "Ver texto"}
                        </button>
                      </span>
                      {showConsent && <span className="animate-fade-in mt-2 block rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">{CONSENT_TEXT}</span>}
                    </span>
                  </label>
                  {consentChecked && (
                    <label className="animate-fade-in mt-3 block pl-7">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Nombre de quien acepta</span>
                      <input value={signer} onChange={(e) => setSigner(e.target.value)} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#50c9d5] focus:outline-none focus:ring-2 focus:ring-[#50c9d5]/15" />
                      <span className="mt-1 block text-[11px] text-slate-400">El paciente, o su tutor si es menor de edad.</span>
                    </label>
                  )}
                </div>
              ) : (
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <FileSignature size={12} /> Consentimiento vigente desde el {formatDate(bootstrap.consent!.grantedAt)}
                </p>
              )}

              <button
                type="button"
                onClick={() => selectedType && onStart(selectedType.key, needsConsent ? signer.trim() : null)}
                disabled={starting || !canStart}
                className="group relative mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#50c9d5] px-6 py-4 text-base font-semibold text-[#080b04] shadow-lg shadow-[#50c9d5]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#45bcc8] hover:shadow-xl hover:shadow-[#50c9d5]/35 disabled:translate-y-0 disabled:cursor-wait disabled:bg-[#50c9d5]/60 disabled:shadow-none"
              >
                {starting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Abriendo consulta...
                  </>
                ) : (
                  <>
                    <Play size={18} className="transition-transform group-hover:scale-110" />
                    {selectedType ? `Iniciar ${selectedType.name.toLowerCase()}` : "Elige el tipo de atencion"}
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                Se registra la hora de inicio y todo lo que escribas queda guardado como borrador
                hasta que cierres la atencion.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
