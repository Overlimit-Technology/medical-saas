"use client";

import { Check } from "lucide-react";
import type { ConsultationDraft } from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_STAGES, type ConsultationStageKey } from "../consultation.constants";
import { stageProgress } from "../consultation.utils";

type Props = {
  current: ConsultationStageKey;
  currentIndex: number;
  draft: ConsultationDraft;
  /** Fichas clinicas creadas en esta cita: cubren la etapa 4. */
  recordsCount: number;
  disabled: boolean;
  onSelect: (stage: ConsultationStageKey) => void;
};

/**
 * Linea de tiempo de la atencion. Marca lo cubierto sin bloquear el paso: el
 * profesional decide el orden, la barra solo le muestra donde va.
 */
export default function StageRail({
  current,
  currentIndex,
  draft,
  recordsCount,
  disabled,
  onSelect,
}: Props) {
  const total = CONSULTATION_STAGES.length;
  const lineProgress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;

  return (
    <nav aria-label="Etapas de la consulta" className="relative">
      {/* Riel de fondo y avance, centrados en la fila de circulos. */}
      <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-0.5 bg-slate-100 md:block">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#19b3bc] to-[#0f8f98] transition-[width] duration-500 ease-out"
          style={{ width: `${lineProgress}%` }}
        />
      </div>

      <ol className="relative grid grid-cols-3 gap-y-4 md:flex md:items-start md:justify-between md:gap-2">
        {CONSULTATION_STAGES.map((stage, index) => {
          const progress =
            stage.key === "records"
              ? { isCovered: recordsCount > 0 }
              : stageProgress(stage.key, draft);

          const isCurrent = stage.key === current;
          const isPast = index < currentIndex;
          const isCovered = progress.isCovered;
          const Icon = stage.icon;

          return (
            <li key={stage.key} className="flex min-w-0 flex-col items-center md:flex-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(stage.key)}
                aria-current={isCurrent ? "step" : undefined}
                className="group flex w-full flex-col items-center gap-2 disabled:cursor-not-allowed"
              >
                <span
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all duration-300 ${
                    isCurrent
                      ? "animate-pulse-ring scale-110 border-[#19b3bc] text-[#19b3bc] shadow-lg shadow-[#19b3bc]/25"
                      : isCovered
                        ? "border-[#19b3bc] bg-[#19b3bc] text-white"
                        : isPast
                          ? "border-slate-300 text-slate-400"
                          : "border-slate-200 text-slate-300 group-hover:border-[#19b3bc]/40 group-hover:text-[#19b3bc]/60"
                  }`}
                >
                  {isCovered && !isCurrent ? (
                    <Check size={18} strokeWidth={3} className="animate-pop-in" />
                  ) : (
                    <Icon size={18} strokeWidth={2.2} />
                  )}

                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-400 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                </span>

                <span className="min-w-0 text-center">
                  <span
                    className={`block truncate text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200 md:text-xs ${
                      isCurrent ? "text-[#0f8f98]" : isCovered ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
