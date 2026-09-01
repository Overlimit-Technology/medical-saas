"use client";

import { NotebookPen } from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationDraft,
  ConsultationSectionKey,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_STAGES } from "../consultation.constants";
import { formatRelative } from "../consultation.utils";
import SectionField from "./SectionField";
import StagePanel from "./StagePanel";

type Props = {
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  readOnly: boolean;
  onSectionChange: (key: ConsultationSectionKey, value: string) => void;
};

const stage = CONSULTATION_STAGES[2];

const EXAM_PHRASES = [
  "Buen estado general",
  "Sin signos de alarma",
  "Examen segmentario normal",
  "Herida sin signos de infeccion",
];

export default function StageAssessment({
  bootstrap,
  draft,
  readOnly,
  onSectionChange,
}: Props) {
  const lastVisit = bootstrap.history.timeline[0];

  return (
    <StagePanel stage={stage}>
      <div className="space-y-6">
        {lastVisit?.diagnosis && (
          <div className="animate-rise-in rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <NotebookPen size={11} /> Diagnostico de {formatRelative(lastVisit.startedAt)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{lastVisit.diagnosis}</p>
          </div>
        )}

        <SectionField
          sectionKey="anamnesis"
          value={draft.sections.anamnesis ?? ""}
          readOnly={readOnly}
          onChange={onSectionChange}
        />

        <SectionField
          sectionKey="physicalExam"
          value={draft.sections.physicalExam ?? ""}
          readOnly={readOnly}
          quickPhrases={EXAM_PHRASES}
          onChange={onSectionChange}
        />
      </div>
    </StagePanel>
  );
}
