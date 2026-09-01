"use client";

import type {
  ConsultationDraft,
  ConsultationSectionKey,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_STAGES } from "../consultation.constants";
import SectionField from "./SectionField";
import StagePanel from "./StagePanel";

type Props = {
  draft: ConsultationDraft;
  readOnly: boolean;
  onSectionChange: (key: ConsultationSectionKey, value: string) => void;
};

const stage = CONSULTATION_STAGES[4];

const INDICATION_PHRASES = [
  "Reposo relativo",
  "Hidratacion abundante",
  "Control si hay fiebre",
  "Consultar en urgencias si empeora",
  "Continuar tratamiento indicado",
];

export default function StageDiagnosis({ draft, readOnly, onSectionChange }: Props) {
  return (
    <StagePanel stage={stage}>
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SectionField
            sectionKey="diagnosis"
            value={draft.sections.diagnosis ?? ""}
            readOnly={readOnly}
            onChange={onSectionChange}
          />
          <SectionField
            sectionKey="diagnosisCode"
            value={draft.sections.diagnosisCode ?? ""}
            readOnly={readOnly}
            onChange={onSectionChange}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionField
            sectionKey="differential"
            value={draft.sections.differential ?? ""}
            readOnly={readOnly}
            onChange={onSectionChange}
          />
          <SectionField
            sectionKey="procedures"
            value={draft.sections.procedures ?? ""}
            readOnly={readOnly}
            onChange={onSectionChange}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionField
            sectionKey="prescription"
            value={draft.sections.prescription ?? ""}
            readOnly={readOnly}
            onChange={onSectionChange}
          />
          <SectionField
            sectionKey="indications"
            value={draft.sections.indications ?? ""}
            readOnly={readOnly}
            quickPhrases={INDICATION_PHRASES}
            onChange={onSectionChange}
          />
        </div>
      </div>
    </StagePanel>
  );
}
