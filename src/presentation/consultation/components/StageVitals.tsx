"use client";

import { CopyPlus, Scale } from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationDraft,
  ConsultationVitalKey,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_STAGES, VITALS_LAYOUT } from "../consultation.constants";
import { computeBmi, evaluateVital, formatRelative } from "../consultation.utils";
import StagePanel from "./StagePanel";
import VitalCard from "./VitalCard";

type Props = {
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  readOnly: boolean;
  onVitalChange: (key: ConsultationVitalKey, value: string) => void;
  onCopyPrevious: () => void;
};

const stage = CONSULTATION_STAGES[1];

const BMI_TONES = {
  low: "border-sky-200 bg-sky-50 text-sky-700",
  normal: "border-[#19b3bc]/30 bg-[#19b3bc]/[0.06] text-[#0f8f98]",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export default function StageVitals({
  bootstrap,
  draft,
  readOnly,
  onVitalChange,
  onCopyPrevious,
}: Props) {
  const { lastVitals } = bootstrap.history;
  const bmi = computeBmi(draft.vitals.weight, draft.vitals.height);
  const measured = Object.values(draft.vitals).filter((value) => value?.trim()).length;
  const hasPrevious = Object.keys(lastVitals).length > 0;
  const lastReading = Object.values(lastVitals)[0];

  const outOfRange = VITALS_LAYOUT.flatMap((group) => group.keys).filter((key) => {
    const flag = evaluateVital(key, draft.vitals[key]);
    return flag === "low" || flag === "high";
  });

  return (
    <StagePanel
      stage={stage}
      aside={
        hasPrevious && !readOnly ? (
          <button
            type="button"
            onClick={onCopyPrevious}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-px hover:border-[#19b3bc]/50 hover:text-[#0f8f98]"
          >
            <CopyPlus size={13} />
            Traer los ultimos valores
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        {hasPrevious && lastReading && (
          <p className="text-xs text-slate-400">
            La comparativa usa la ultima medicion registrada, de {formatRelative(lastReading.effectiveAt)}.
          </p>
        )}

        {VITALS_LAYOUT.map((group, groupIndex) => (
          <div key={group.title}>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {group.title}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.keys.map((key, index) => (
                <div
                  key={key}
                  className="animate-rise-in"
                  style={{ animationDelay: `${groupIndex * 70 + index * 45}ms` }}
                >
                  <VitalCard
                    vitalKey={key}
                    value={draft.vitals[key] ?? ""}
                    previous={lastVitals[key]}
                    readOnly={readOnly}
                    onChange={onVitalChange}
                  />
                </div>
              ))}

              {group.title === "Antropometria" && (
                <div
                  className={`animate-rise-in flex flex-col justify-center rounded-2xl border p-3.5 transition-colors duration-300 ${
                    bmi ? BMI_TONES[bmi.tone] : "border-dashed border-slate-200 bg-slate-50/50"
                  }`}
                  style={{ animationDelay: "160ms" }}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                    <Scale size={11} /> IMC
                  </p>
                  {bmi ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold tabular-nums">{bmi.value}</p>
                      <p className="text-xs font-medium">{bmi.label}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      Ingresa peso y talla para calcularlo.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <p className="text-slate-500">
            {measured === 0
              ? "Sin mediciones registradas en esta consulta."
              : `${measured} ${measured === 1 ? "medicion registrada" : "mediciones registradas"}.`}
          </p>
          {outOfRange.length > 0 && (
            <p className="animate-pop-in font-medium text-amber-700">
              {outOfRange.length} fuera del rango de referencia
            </p>
          )}
        </div>
      </div>
    </StagePanel>
  );
}
