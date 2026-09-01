import type {
  ConsultationDraft,
  ConsultationVitalKey,
} from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_VITALS } from "@/domain/consultations/entities/ConsultationCodes";
import { CONSULTATION_STAGES, type ConsultationStageKey } from "./consultation.constants";

const dateFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});
const timeFormatter = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" });
const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatDate(value: string | Date) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatTime(value: string | Date) {
  return timeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

/** "hace 3 dias", "hace 2 meses". Para la linea de tiempo del paciente. */
export function formatRelative(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);

  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`;

  const years = Math.floor(months / 12);
  return `hace ${years} ${years === 1 ? "ano" : "anos"}`;
}

/** Cronometro de la consulta en formato mm:ss / h:mm:ss. */
export function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function parseVitalNumber(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw.trim().replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export type VitalFlag = "empty" | "normal" | "low" | "high" | "invalid";

/** Clasifica una medicion contra su rango de referencia. Marca, no bloquea. */
export function evaluateVital(key: ConsultationVitalKey, raw: string | undefined): VitalFlag {
  const value = parseVitalNumber(raw);
  if (value === null) return raw?.trim() ? "invalid" : "empty";

  const meta = CONSULTATION_VITALS[key];
  if (value < meta.min || value > meta.max) return "invalid";
  if (meta.normalMin !== null && value < meta.normalMin) return "low";
  if (meta.normalMax !== null && value > meta.normalMax) return "high";

  return "normal";
}

export type BmiResult = {
  value: number;
  label: string;
  /** Clave de color; la UI decide el hex. */
  tone: "low" | "normal" | "warn" | "high";
};

/** IMC a partir de peso (kg) y talla (cm). Categorias OMS para adultos. */
export function computeBmi(weightRaw?: string, heightRaw?: string): BmiResult | null {
  const weight = parseVitalNumber(weightRaw);
  const heightCm = parseVitalNumber(heightRaw);
  if (weight === null || heightCm === null || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  const value = Number((weight / (heightM * heightM)).toFixed(1));
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null;

  if (value < 18.5) return { value, label: "Bajo peso", tone: "low" };
  if (value < 25) return { value, label: "Normal", tone: "normal" };
  if (value < 30) return { value, label: "Sobrepeso", tone: "warn" };
  return { value, label: "Obesidad", tone: "high" };
}

/** Variacion respecto de la ultima medicion conocida. */
export function vitalDelta(key: ConsultationVitalKey, raw: string | undefined, previous?: number) {
  const value = parseVitalNumber(raw);
  if (value === null || previous === undefined) return null;

  const diff = Number((value - previous).toFixed(CONSULTATION_VITALS[key].decimals));
  if (diff === 0) return { diff, label: "igual", direction: "flat" as const };

  return {
    diff,
    label: `${diff > 0 ? "+" : ""}${diff}`,
    direction: diff > 0 ? ("up" as const) : ("down" as const),
  };
}

export function hasText(value: string | undefined) {
  return Boolean(value && value.trim());
}

/** Cuantas secciones de la etapa tienen contenido, y si ya esta cubierta. */
export function stageProgress(stageKey: ConsultationStageKey, draft: ConsultationDraft) {
  const stage = CONSULTATION_STAGES.find((item) => item.key === stageKey);
  if (!stage) return { filled: 0, total: 0, isCovered: false };

  const filled = stage.sections.filter((section) => hasText(draft.sections[section])).length;

  if (stageKey === "vitals") {
    const measured = Object.values(draft.vitals).filter((value) => hasText(value)).length;
    return { filled: measured, total: 0, isCovered: measured > 0 };
  }

  return {
    filled,
    total: stage.sections.length,
    isCovered: stage.keySection ? hasText(draft.sections[stage.keySection]) : filled > 0,
  };
}

/** Fecha ISO local (sin desfase UTC) para inputs date/time. */
export function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function toTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(11, 16);
}

/** Combina los inputs date + time en una fecha local. */
export function fromDateTimeInputs(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

/** Fechas que generaria un plan de N sesiones, para previsualizarlo. */
export function projectPlanSessions(start: Date, totalSessions: number, frequencyDays: number) {
  const sessions: Date[] = [];
  const safeTotal = Math.max(1, Math.min(90, totalSessions));
  const safeFrequency = Math.max(1, Math.min(60, frequencyDays));

  for (let index = 0; index < safeTotal; index += 1) {
    sessions.push(new Date(start.getTime() + index * safeFrequency * 86400000));
  }

  return sessions;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

export function minutesBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(5, Math.round(diff / 60000));
}
