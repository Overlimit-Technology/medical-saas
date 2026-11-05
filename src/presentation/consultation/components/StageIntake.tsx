"use client";

import { useState } from "react";
import { Check, DoorOpen, Loader2, ShieldCheck, Timer, TriangleAlert } from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationDraft,
  ConsultationSectionKey,
  PatientBackgroundData,
} from "@/domain/consultations/entities/Consultation";
import type { SaveState } from "../ConsultationViewModel";
import { CONSULTATION_STAGES } from "../consultation.constants";
import { formatTime } from "../consultation.utils";
import SectionField from "./SectionField";
import StagePanel from "./StagePanel";

type Props = {
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  readOnly: boolean;
  background: PatientBackgroundData | null;
  backgroundState: SaveState;
  onSectionChange: (key: ConsultationSectionKey, value: string) => void;
  onBackgroundChange: (key: keyof Omit<PatientBackgroundData, "updatedAt">, value: string) => void;
};

const BACKGROUND_FIELDS: Array<{ key: keyof Omit<PatientBackgroundData, "updatedAt">; label: string; placeholder: string; quick: string; alert?: boolean }> = [
  { key: "allergies", label: "Alergias", placeholder: "Penicilina, AINEs, latex...", quick: "Sin alergias conocidas", alert: true },
  { key: "diseases", label: "Enfermedades", placeholder: "Hipertension, diabetes tipo 2...", quick: "Sin enfermedades cronicas" },
  { key: "medications", label: "Medicamentos", placeholder: "Losartan 50 mg cada 12 h...", quick: "Sin medicacion habitual" },
  { key: "surgeries", label: "Cirugias", placeholder: "Apendicectomia 2015...", quick: "Sin cirugias" },
];

function BackgroundCard({ background, state, readOnly, onChange }: { background: PatientBackgroundData; state: SaveState; readOnly: boolean; onChange: Props["onBackgroundChange"] }) {
  // Solo al abrir: si nunca se guardaron y traen texto, vienen de consultas anteriores. Al editar, el aviso se va.
  const [inheritedAtStart] = useState(() => !background.updatedAt && Boolean(background.allergies || background.medications));
  const inherited = inheritedAtStart && state === "idle";
  return (
    <section className="animate-rise-in rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <ShieldCheck size={15} className="text-[#1e737b]" /> Antecedentes generales
        </h3>
        <span className="text-xs text-slate-400">Se comparten con todas las fichas del paciente.</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          {state === "saving" || state === "pending" ? (
            <><Loader2 size={11} className="animate-spin" /> Guardando</>
          ) : state === "saved" ? (
            <><Check size={11} className="text-emerald-500" /> Guardado</>
          ) : state === "error" ? (
            <span className="text-rose-500">No se guardo</span>
          ) : null}
        </span>
      </div>
      {inherited && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <TriangleAlert size={13} className="mt-px shrink-0" /> Vienen de la ultima consulta. Confirmalos con el paciente.
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {BACKGROUND_FIELDS.map((f) => {
          const value = background[f.key];
          const isAlert = f.alert && value.trim() && !/^sin /i.test(value.trim());
          return (
            <div key={f.key}>
              <label htmlFor={`bg-${f.key}`} className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] ${isAlert ? "text-rose-600" : "text-slate-500"}`}>
                {f.label}
              </label>
              <textarea
                id={`bg-${f.key}`}
                rows={2}
                value={value}
                disabled={readOnly}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={`w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 disabled:bg-slate-50 ${isAlert ? "border-rose-200 focus:border-rose-300 focus:ring-rose-100" : "border-slate-200 focus:border-[#50c9d5] focus:ring-[#50c9d5]/15"}`}
              />
              {!readOnly && !value.trim() && (
                <button type="button" onClick={() => onChange(f.key, f.quick)} className="mt-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-all hover:border-[#50c9d5]/50 hover:text-[#1e737b]">
                  + {f.quick}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const stage = CONSULTATION_STAGES[0];

const COMPLAINT_PHRASES = [
  "Control programado",
  "Dolor",
  "Curacion",
  "Resultado de examenes",
  "Certificado",
];

export default function StageIntake({ bootstrap, draft, readOnly, background, backgroundState, onSectionChange, onBackgroundChange }: Props) {
  const { appointment, history } = bootstrap;
  const allergiesValue = draft.sections.allergies ?? "";
  const medicationValue = draft.sections.currentMedication ?? "";

  // "Heredado" solo mientras el texto sea identico al de la consulta anterior:
  // en cuanto el profesional lo edita, pasa a ser un dato de hoy.
  const allergiesInherited = Boolean(
    history.carriedAllergies && allergiesValue === history.carriedAllergies
  );
  const medicationInherited = Boolean(
    history.carriedMedication && medicationValue === history.carriedMedication
  );

  return (
    <StagePanel stage={stage}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Llegada
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              {appointment.arrivedAt ? (
                <>
                  <DoorOpen size={15} className="text-emerald-600" />
                  En sala desde las {formatTime(appointment.arrivedAt)}
                </>
              ) : appointment.delayMinutes ? (
                <>
                  <Timer size={15} className="text-amber-600" />
                  Aviso de {appointment.delayMinutes} min de demora
                </>
              ) : (
                <>
                  <Timer size={15} className="text-slate-300" />
                  Recepcion no registro la llegada
                </>
              )}
            </p>
          </div>

          <div
            className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-4"
            style={{ animationDelay: "60ms" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Antecedente de la cita
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {appointment.treatmentPlan
                ? `${appointment.treatmentPlan.name} · sesion ${appointment.treatmentPlan.sessionIndex ?? "?"} de ${appointment.treatmentPlan.totalSessions}`
                : history.totalVisits > 0
                  ? `${history.totalVisits} atenciones previas en la clinica`
                  : "Primera atencion del paciente"}
            </p>
          </div>
        </div>

        <SectionField
          sectionKey="chiefComplaint"
          value={draft.sections.chiefComplaint ?? ""}
          readOnly={readOnly}
          quickPhrases={COMPLAINT_PHRASES}
          onChange={onSectionChange}
        />
        {appointment.notes?.trim() && appointment.notes.trim() !== "[demo]" && (
          <p className="-mt-3 text-xs text-slate-400">El motivo viene de lo que se anoto al agendar la cita.</p>
        )}

        {background ? (
          <BackgroundCard background={background} state={backgroundState} readOnly={readOnly} onChange={onBackgroundChange} />
        ) : null}

        {!background && (allergiesInherited || medicationInherited) && (
          <div className="animate-rise-in flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              Alergias y farmacos vienen de la ultima consulta que los registro. Confirmalos con el
              paciente y corrigelos si cambiaron: se guardan de nuevo con la atencion de hoy.
            </p>
          </div>
        )}

        {!background && (<div className="grid gap-5 lg:grid-cols-2">
          <SectionField
            sectionKey="allergies"
            value={allergiesValue}
            readOnly={readOnly}
            inherited={allergiesInherited}
            quickPhrases={["Sin alergias conocidas"]}
            onChange={onSectionChange}
          />
          <SectionField
            sectionKey="currentMedication"
            value={medicationValue}
            readOnly={readOnly}
            inherited={medicationInherited}
            quickPhrases={["Sin medicacion habitual"]}
            onChange={onSectionChange}
          />
        </div>)}
      </div>
    </StagePanel>
  );
}
