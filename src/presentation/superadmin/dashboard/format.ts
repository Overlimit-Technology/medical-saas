export const clp = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);

// Monto corto para los ejes de las graficas ($750 mil, $1,2 M).
export const clpShort = (value: number) =>
  `$${new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;

export const pct = (value: number | null, digits = 1) => (value === null ? "-" : `${(value * 100).toFixed(digits)}%`);

export const signedPct = (value: number | null) =>
  value === null ? "-" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

export const num = (value: number) => new Intl.NumberFormat("es-CL").format(value);

export function monthLabel(key: string, long = false) {
  const [y, m] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CL", long ? { month: "long", year: "numeric" } : { month: "short" }).format(
    new Date(y, m - 1, 1)
  );
  return label.replace(".", "");
}

export function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function dateTimeLabel(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export const STATUS_LABEL: Record<string, string> = {
  TRIAL: "En prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Morosa",
  CANCELED: "Cancelada",
  SUSPENDED: "Sin acceso",
};

export const STATUS_COLOR: Record<string, string> = {
  TRIAL: "#f59e0b",
  ACTIVE: "#10b981",
  PAST_DUE: "#f97316",
  CANCELED: "#f43f5e",
};

export function statusTone(status: string): "emerald" | "amber" | "rose" | "slate" | "cyan" {
  if (status === "ACTIVE") return "emerald";
  if (status === "PAST_DUE") return "amber";
  if (status === "CANCELED") return "rose";
  if (status === "TRIAL") return "cyan";
  return "slate";
}

export const EVENT_LABEL: Record<string, string> = {
  SUPERADMIN_CLINIC_CREATE: "Sede creada",
  SUPERADMIN_CLINIC_UPDATE: "Datos comerciales editados",
  SUPERADMIN_CLINIC_SUSPEND: "Acceso suspendido",
  SUPERADMIN_CLINIC_REACTIVATE: "Acceso reactivado",
  SUPERADMIN_CLINIC_PAST_DUE: "Marcada como morosa",
  SUPERADMIN_CLINIC_PAID: "Pago regularizado",
  SUPERADMIN_CLINIC_CANCEL: "Marcada como cancelada",
  SUPERADMIN_CLINIC_EXTEND_TRIAL: "Prueba extendida",
  SUPERADMIN_CLINIC_END_TRIAL_CONVERT: "Prueba convertida en suscripcion",
  SUPERADMIN_CLINIC_END_TRIAL_CANCEL: "Prueba terminada sin conversion",
};

// Llamada JSON a las rutas del super admin; lanza Error con el mensaje del servidor.
export async function api<T = Record<string, unknown>>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
  if (!res.ok || !body || body.ok === false) {
    throw new Error(body?.error || (res.status === 401 || res.status === 403 ? "Sin permiso." : "No se pudo completar la solicitud."));
  }
  return body as T;
}
