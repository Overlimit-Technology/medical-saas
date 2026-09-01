"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type {
  ConsultationVitalKey,
  ConsultationVitalReading,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_VITALS } from "@/domain/consultations/entities/ConsultationCodes";
import { evaluateVital, formatRelative, vitalDelta, type VitalFlag } from "../consultation.utils";

type Props = {
  vitalKey: ConsultationVitalKey;
  value: string;
  previous?: ConsultationVitalReading;
  readOnly: boolean;
  onChange: (key: ConsultationVitalKey, value: string) => void;
};

/** Color del borde y del valor segun donde cae la medicion. */
const FLAG_STYLES: Record<VitalFlag, { ring: string; text: string; chip: string }> = {
  empty: { ring: "border-slate-200", text: "text-slate-700", chip: "text-slate-400" },
  normal: { ring: "border-[#19b3bc]/40", text: "text-[#0f8f98]", chip: "text-[#0f8f98]" },
  low: { ring: "border-sky-300", text: "text-sky-700", chip: "text-sky-600" },
  high: { ring: "border-amber-300", text: "text-amber-700", chip: "text-amber-600" },
  invalid: { ring: "border-rose-300", text: "text-rose-600", chip: "text-rose-500" },
};

const FLAG_LABELS: Record<VitalFlag, string | null> = {
  empty: null,
  normal: "En rango",
  low: "Bajo",
  high: "Alto",
  invalid: "Revisar",
};

export default function VitalCard({ vitalKey, value, previous, readOnly, onChange }: Props) {
  const meta = CONSULTATION_VITALS[vitalKey];
  const flag = evaluateVital(vitalKey, value);
  const styles = FLAG_STYLES[flag];
  const delta = vitalDelta(vitalKey, value, previous?.value);
  const referenceLabel =
    meta.normalMin !== null && meta.normalMax !== null
      ? `${meta.normalMin} - ${meta.normalMax}`
      : null;

  return (
    <div
      className={`group relative rounded-2xl border bg-white p-3.5 transition-all duration-200 hover:shadow-md hover:shadow-slate-900/5 ${styles.ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {meta.shortLabel}
          </p>
          <p className="truncate text-[11px] text-slate-400">{meta.label}</p>
        </div>
        {FLAG_LABELS[flag] && (
          <span
            className={`animate-pop-in shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold ${styles.chip}`}
          >
            {FLAG_LABELS[flag]}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step={meta.step}
          min={meta.min}
          max={meta.max}
          value={value}
          disabled={readOnly}
          placeholder="--"
          onChange={(event) => onChange(vitalKey, event.target.value)}
          aria-label={`${meta.label} en ${meta.unit}`}
          className={`w-full min-w-0 border-0 bg-transparent p-0 text-2xl font-semibold tabular-nums outline-none transition-colors placeholder:text-slate-200 focus:ring-0 disabled:text-slate-400 ${styles.text} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        <span className="shrink-0 text-xs font-medium text-slate-400">{meta.unit}</span>
      </div>

      <div className="mt-2 flex min-h-[18px] items-center justify-between gap-2 text-[11px]">
        {referenceLabel ? (
          <span className="text-slate-300">Ref. {referenceLabel}</span>
        ) : (
          <span />
        )}

        {delta && previous ? (
          <span
            title={`Anterior: ${previous.value} ${meta.unit} (${formatRelative(previous.effectiveAt)})`}
            className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${
              delta.direction === "flat"
                ? "text-slate-400"
                : delta.direction === "up"
                  ? "text-amber-600"
                  : "text-sky-600"
            }`}
          >
            {delta.direction === "flat" ? (
              <Minus size={11} />
            ) : delta.direction === "up" ? (
              <ArrowUpRight size={11} />
            ) : (
              <ArrowDownRight size={11} />
            )}
            {delta.label}
          </span>
        ) : previous ? (
          <span className="text-slate-300 tabular-nums">Prev. {previous.value}</span>
        ) : null}
      </div>
    </div>
  );
}
