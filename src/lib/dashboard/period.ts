/**
 * Periodos del panel personalizable: semana, mes, trimestre, semestre y año.
 * Todo trabaja con fechas locales de Chile en formato YYYY-MM-DD, asi el mismo calculo sirve en el
 * servidor (que corre en UTC) y en el navegador. Los rangos son [inicio, fin) y cada periodo trae
 * el periodo anterior del mismo largo para comparar y sus tramos para los graficos de evolucion.
 */
import { addDaysToDateString, weekdayOf } from "@/lib/chileTime";

export const PERIODS = ["week", "month", "quarter", "semester", "year"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Año",
};

/** Cuantos periodos se puede mover el usuario hacia atras o hacia adelante. */
export const OFFSET_MIN = -36;
export const OFFSET_MAX = 12;

export type Bucket = { label: string; start: string; end: string };

export type PeriodRange = {
  key: PeriodKey;
  offset: number;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  label: string;
  /** Tramos del grafico: dias (semana y mes), semanas (trimestre) o meses (semestre y año). */
  buckets: Bucket[];
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => `${n}`.padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (date: string) => date.split("-").map(Number) as [number, number, number];

/** Primer dia del mes `months` meses despues del mes de `date` (acepta negativos). */
function addMonths(date: string, months: number): string {
  const [y, m] = parts(date);
  const index = y * 12 + (m - 1) + months;
  return ymd(Math.floor(index / 12), (index % 12) + 1, 1);
}

const shortDate = (date: string) => {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1].toLowerCase()}`;
};

function dayBuckets(start: string, end: string, label: (date: string, i: number) => string): Bucket[] {
  const buckets: Bucket[] = [];
  for (let day = start, i = 0; day < end; day = addDaysToDateString(day, 1), i++) {
    buckets.push({ label: label(day, i), start: day, end: addDaysToDateString(day, 1) });
  }
  return buckets;
}

function monthBuckets(start: string, count: number): Bucket[] {
  return Array.from({ length: count }, (_, i) => {
    const from = addMonths(start, i);
    return { label: MONTHS[parts(from)[1] - 1], start: from, end: addMonths(start, i + 1) };
  });
}

/** Semanas desde `start`; la ultima puede quedar corta para no pasarse del fin del periodo. */
function weekBuckets(start: string, end: string): Bucket[] {
  const buckets: Bucket[] = [];
  for (let from = start; from < end; ) {
    const next = addDaysToDateString(from, 7);
    const to = next < end ? next : end;
    buckets.push({ label: shortDate(from), start: from, end: to });
    from = to;
  }
  return buckets;
}

export function clampOffset(offset: number) {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(OFFSET_MAX, Math.max(OFFSET_MIN, Math.trunc(offset)));
}

/**
 * Periodo calendario que contiene `today`, movido `offset` periodos (0 = el actual, -1 = el anterior).
 * La semana parte el lunes.
 */
export function resolvePeriod(key: PeriodKey, offset: number, today: string): PeriodRange {
  const off = clampOffset(offset);
  const [y, m] = parts(today);

  if (key === "week") {
    const monday = addDaysToDateString(today, -((weekdayOf(today) + 6) % 7) + off * 7);
    const end = addDaysToDateString(monday, 7);
    const last = addDaysToDateString(end, -1);
    return {
      key,
      offset: off,
      start: monday,
      end,
      prevStart: addDaysToDateString(monday, -7),
      prevEnd: monday,
      label: `Semana del ${shortDate(monday)} al ${shortDate(last)} ${parts(last)[0]}`,
      buckets: dayBuckets(monday, end, (day, i) => `${WEEKDAYS[i]} ${parts(day)[2]}`),
    };
  }

  // Meses por periodo y primer mes del periodo actual.
  const size = key === "month" ? 1 : key === "quarter" ? 3 : key === "semester" ? 6 : 12;
  const firstMonth = Math.floor((m - 1) / size) * size + 1;
  const start = addMonths(ymd(y, firstMonth, 1), off * size);
  const end = addMonths(start, size);
  const [sy, sm] = parts(start);
  const nth = Math.floor((sm - 1) / size) + 1;
  const label =
    key === "month"
      ? `${MONTHS_LONG[sm - 1]} ${sy}`
      : key === "quarter"
        ? `${nth}.º trimestre ${sy}`
        : key === "semester"
          ? `${nth}.º semestre ${sy}`
          : `${sy}`;

  return {
    key,
    offset: off,
    start,
    end,
    prevStart: addMonths(start, -size),
    prevEnd: start,
    label,
    buckets:
      key === "month"
        ? dayBuckets(start, end, (day) => `${parts(day)[2]}`)
        : key === "quarter"
          ? weekBuckets(start, end)
          : monthBuckets(start, size),
  };
}

/** Indice del tramo que contiene la fecha, o -1 si queda fuera del periodo. */
export function bucketIndex(buckets: Bucket[], date: string): number {
  for (let i = 0; i < buckets.length; i++) {
    if (date >= buckets[i].start && date < buckets[i].end) return i;
  }
  return -1;
}

/** Texto corto del periodo anterior para las comparaciones ("vs. semana anterior"). */
export function previousLabel(key: PeriodKey) {
  return {
    week: "vs. semana anterior",
    month: "vs. mes anterior",
    quarter: "vs. trimestre anterior",
    semester: "vs. semestre anterior",
    year: "vs. año anterior",
  }[key];
}
