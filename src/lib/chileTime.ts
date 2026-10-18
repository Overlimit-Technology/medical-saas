/**
 * Utilidades de hora local de Chile independientes de la zona horaria del servidor.
 * Los servidores (por ejemplo Vercel) suelen correr en UTC, por eso no se usa la hora local del proceso.
 */
export const CLINIC_TIME_ZONE = "America/Santiago";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getLocalParts(date: Date): LocalParts {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function offsetMinutes(date: Date) {
  const p = getLocalParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Convierte una fecha y hora locales de Chile ("2026-10-20", "09:30") a un instante UTC. */
export function chileLocalToDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - offsetMinutes(new Date(guess)) * 60000;
  // Segunda pasada por si el desfase cambia justo en el cambio de horario.
  result = guess - offsetMinutes(new Date(result)) * 60000;
  return new Date(result);
}

/** Fecha local de Chile en formato YYYY-MM-DD. */
export function chileDateString(date: Date): string {
  const p = getLocalParts(date);
  return `${p.year}-${`${p.month}`.padStart(2, "0")}-${`${p.day}`.padStart(2, "0")}`;
}

/** Dia de la semana local (0 = domingo ... 6 = sabado) para una fecha YYYY-MM-DD. */
export function weekdayOf(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

export function formatChileDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CLINIC_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatChileTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CLINIC_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
