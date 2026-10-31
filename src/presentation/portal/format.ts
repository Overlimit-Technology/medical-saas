const TZ = "America/Santiago";

const part = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: TZ, ...options }).format(date);

/** Partes para el bloque de fecha: "mar", "3", "nov". */
export function dateBlock(date: Date) {
  return {
    weekday: part(date, { weekday: "short" }).replace(".", ""),
    day: part(date, { day: "numeric" }),
    month: part(date, { month: "short" }).replace(".", ""),
  };
}

export const timeOf = (date: Date) => part(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "martes 3 de noviembre" */
export const longDate = (date: Date) => part(date, { weekday: "long", day: "numeric", month: "long" });

/** Primera letra en mayuscula, sin tocar el resto ("Sábado, 31 de octubre"). */
export const capFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "3 nov 2026" */
export const shortDate = (date: Date) => part(date, { day: "numeric", month: "short", year: "numeric" }).replace(".", "");

export const clp = (value: number) => `$${Math.round(value).toLocaleString("es-CL")}`;

export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);

export const APPOINTMENT_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "off" | "err" }> = {
  SCHEDULED: { label: "Por confirmar", tone: "warn" },
  CONFIRMED: { label: "Confirmada", tone: "ok" },
  COMPLETED: { label: "Atendida", tone: "ok" },
  CANCELLED: { label: "Cancelada", tone: "off" },
  NO_SHOW: { label: "No asististe", tone: "err" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "off" }> = {
  PENDING: { label: "Pendiente", tone: "warn" },
  PAID: { label: "Pagado", tone: "ok" },
  WAIVED: { label: "Sin costo", tone: "off" },
};
