"use client";

import { useEffect, useRef } from "react";
import { Check, History } from "lucide-react";
import type { AttentionField } from "@/lib/clinical/attentionTypes";
import type { PreviousFieldValue } from "@/domain/consultations/entities/Consultation";
import { formatRelative } from "../consultation.utils";

type Props = {
  field: AttentionField;
  value: string;
  previous?: PreviousFieldValue;
  readOnly: boolean;
  onChange: (id: string, value: string) => void;
};

const numberFormat = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export const parseList = (value: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/** Texto corto de un valor guardado, para el "antes" y los resumenes. */
export function displayValue(field: AttentionField, value: string) {
  if (!value) return "";
  if (field.kind === "checklist") return parseList(value).join(", ");
  if (field.kind === "checkbox") return value === "true" ? "Si" : "No";
  if (field.kind === "number" || field.kind === "scale") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? `${numberFormat.format(n)}${field.unit ? ` ${field.unit}` : field.kind === "scale" ? `/${field.max ?? 10}` : ""}` : value;
  }
  if (field.kind === "date") {
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.valueOf()) ? value : d.toLocaleDateString("es-CL", { dateStyle: "medium" });
  }
  return value;
}

const base =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all duration-200 placeholder:text-slate-300 focus:border-[#50c9d5] focus:outline-none focus:ring-2 focus:ring-[#50c9d5]/15 disabled:bg-slate-50 disabled:text-slate-500";

function PreviousChip({ field, value, previous }: { field: AttentionField; value: string; previous?: PreviousFieldValue }) {
  if (!previous || !field.carry) return null;
  const before = displayValue(field, previous.value);
  if (!before) return null;
  let delta: React.ReactNode = null;
  if ((field.kind === "number" || field.kind === "scale") && value) {
    const a = Number(previous.value.replace(",", "."));
    const b = Number(value.replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
      const diff = b - a;
      delta = (
        <span className={`font-bold ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
          {diff > 0 ? "+" : ""}
          {numberFormat.format(diff)}
        </span>
      );
    }
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500" title={`Registrado ${formatRelative(previous.at)}`}>
      <History size={10} className="shrink-0" /> Antes: {before} {delta}
    </span>
  );
}

export default function AttentionFieldInput({ field, value, previous, readOnly, onChange }: Props) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const node = areaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.max(node.scrollHeight, 92)}px`;
  }, [value]);

  const set = (next: string) => onChange(field.id, next);
  const id = `field-${field.id}`;

  let control: React.ReactNode;
  switch (field.kind) {
    case "longtext":
      control = <textarea id={id} ref={areaRef} rows={3} value={value} disabled={readOnly} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} className={`${base} resize-none overflow-hidden leading-relaxed`} />;
      break;
    case "number":
      control = (
        <div className="relative">
          <input id={id} type="text" inputMode="decimal" value={value} disabled={readOnly} placeholder={field.placeholder ?? (field.min !== undefined ? `${field.min} a ${field.max}` : "")} onChange={(e) => set(e.target.value.replace(/[^\d.,-]/g, ""))} className={`${base} tabular-nums ${field.unit ? "pr-14" : ""}`} />
          {field.unit && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{field.unit}</span>}
        </div>
      );
      break;
    case "date":
      control = <input id={id} type="date" value={value} disabled={readOnly} onChange={(e) => set(e.target.value)} className={base} />;
      break;
    case "checkbox":
      control = (
        <button type="button" role="switch" aria-checked={value === "true"} disabled={readOnly} onClick={() => set(value === "true" ? "" : "true")} className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${value === "true" ? "border-[#50c9d5] bg-[#50c9d5]/10 text-[#1e737b]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${value === "true" ? "border-[#50c9d5] bg-[#50c9d5] text-white" : "border-slate-300"}`}>{value === "true" && <Check size={13} strokeWidth={3} />}</span>
          {value === "true" ? "Si" : "No"}
        </button>
      );
      break;
    case "list":
      control = (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={`${id}-label`}>
          {(field.options ?? []).map((option) => {
            const on = value === option;
            return (
              <button key={option} type="button" role="radio" aria-checked={on} disabled={readOnly} onClick={() => set(on ? "" : option)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${on ? "border-[#50c9d5] bg-[#50c9d5] text-[#080b04] shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:-translate-y-px hover:border-[#50c9d5]/50"}`}>
                {option}
              </button>
            );
          })}
        </div>
      );
      break;
    case "checklist": {
      const selected = parseList(value);
      const toggle = (option: string) => {
        const next = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option];
        set(next.length ? JSON.stringify(next) : "");
      };
      control = (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(field.options ?? []).map((option) => {
            const on = selected.includes(option);
            return (
              <button key={option} type="button" role="checkbox" aria-checked={on} disabled={readOnly} onClick={() => toggle(option)} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all duration-200 ${on ? "border-[#50c9d5]/60 bg-[#50c9d5]/8 text-slate-800" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${on ? "border-[#50c9d5] bg-[#50c9d5] text-white" : "border-slate-300"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                {option}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "scale": {
      const min = field.min ?? 0;
      const max = field.max ?? 10;
      const current = value === "" ? null : Number(value);
      const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      control = (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-labelledby={`${id}-label`}>
          {steps.map((n) => {
            const on = current === n;
            // De verde a rojo para el dolor; turquesa para el resto.
            const pain = field.id === "pain.eva";
            const hue = pain ? 140 - ((n - min) / (max - min || 1)) * 140 : null;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => set(on ? "" : String(n))}
                className={`flex h-9 min-w-9 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-all duration-150 ${on ? "scale-110 border-transparent text-white shadow-md" : "border-slate-200 bg-white text-slate-500 hover:-translate-y-px hover:border-slate-300"}`}
                style={on ? { background: hue !== null ? `hsl(${hue} 70% 45%)` : "#50c9d5" } : undefined}
              >
                {n}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    default:
      control = <input id={id} type="text" value={value} disabled={readOnly} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} className={base} />;
  }

  return (
    <div className={field.width === "full" || field.kind === "longtext" || field.kind === "checklist" || field.kind === "scale" ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label id={`${id}-label`} htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {field.label}
        </label>
        <PreviousChip field={field} value={value} previous={previous} />
      </div>
      {field.help && <p className="mb-2 text-xs text-slate-400">{field.help}</p>}
      {control}
    </div>
  );
}
