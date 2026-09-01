"use client";

import { DoorOpen, Timer, TriangleAlert } from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationDraft,
  ConsultationSectionKey,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_STAGES } from "../consultation.constants";
import { formatTime } from "../consultation.utils";
import SectionField from "./SectionField";
import StagePanel from "./StagePanel";

type Props = {
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  readOnly: boolean;
  onSectionChange: (key: ConsultationSectionKey, value: string) => void;
};

const stage = CONSULTATION_STAGES[0];

const COMPLAINT_PHRASES = [
  "Control programado",
  "Dolor",
  "Curacion",
  "Resultado de examenes",
  "Certificado",
];

export default function StageIntake({ bootstrap, draft, readOnly, onSectionChange }: Props) {
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

        {(allergiesInherited || medicationInherited) && (
          <div className="animate-rise-in flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              Alergias y farmacos vienen de la ultima consulta que los registro. Confirmalos con el
              paciente y corrigelos si cambiaron: se guardan de nuevo con la atencion de hoy.
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
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
        </div>

        <SectionField
          sectionKey="chiefComplaint"
          value={draft.sections.chiefComplaint ?? ""}
          readOnly={readOnly}
          quickPhrases={COMPLAINT_PHRASES}
          onChange={onSectionChange}
        />
      </div>
    </StagePanel>
  );
}
