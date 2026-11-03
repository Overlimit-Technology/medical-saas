/**
 * Catalogo del panel personalizable del admin: las metricas que se pueden poner en un widget,
 * los graficos que admite cada una y el formato del diseño guardado. Lo usan el navegador (selector
 * de widgets) y el servidor (calculo y validacion), asi que aqui no hay consultas.
 *
 * Las metricas salen de los modulos que existen en el codigo. Las funciones del mapa de Miro que
 * todavia no tienen datos van en UPCOMING y se muestran como "Próximamente" en el selector.
 */
import { z } from "zod";
import { PERIODS, type PeriodKey } from "@/lib/dashboard/period";

// ---------------------------------------------------------------------------
// Graficos
// ---------------------------------------------------------------------------

export const CHARTS = ["kpi", "spark", "ring", "line", "area", "bar", "hbar", "donut", "table", "list", "files", "shortcut"] as const;
export type ChartType = (typeof CHARTS)[number];

export const CHART_LABEL: Record<ChartType, string> = {
  kpi: "Cifra",
  spark: "Cifra con tendencia",
  ring: "Anillo",
  line: "Líneas",
  area: "Área",
  bar: "Columnas",
  hbar: "Barras",
  donut: "Dona",
  table: "Tabla",
  list: "Lista",
  files: "Archivos",
  shortcut: "Acceso directo",
};

// ---------------------------------------------------------------------------
// Tamaño: libre, pero siempre en celdas enteras de la grilla
// ---------------------------------------------------------------------------

/** Grilla de 4 columnas en escritorio y 2 en tablet y celular. Ver .zs-dash-grid en globals.css. */
export const GRID = { cols: 4, maxRows: 4, gapPx: 16 } as const;

/** Ancho (1 a 4 columnas) y alto (1 a 4 filas) de un widget, en celdas. */
export type Span = { w: number; h: number };

/** Atajos con nombre, como los tamaños de los widgets del iPhone. Cualquier otra combinacion tambien vale. */
export const PRESETS = [
  { id: "s", label: "Pequeño", w: 1, h: 1 },
  { id: "m", label: "Mediano", w: 2, h: 1 },
  { id: "l", label: "Grande", w: 2, h: 2 },
  { id: "full", label: "Ancho completo", w: 4, h: 1 },
  { id: "xl", label: "Completo alto", w: 4, h: 2 },
] as const;

export const presetOf = (span: Span) => PRESETS.find((p) => p.w === span.w && p.h === span.h) ?? null;
export const spanLabel = (span: Span) => {
  const preset = presetOf(span);
  return preset ? `${preset.label} · ${span.w}×${span.h}` : `${span.w} × ${span.h}`;
};

/** Las cifras caben en una celda; los graficos necesitan al menos dos (2x1 o 1x2) para no cortarse. */
const FIGURES: readonly string[] = ["kpi", "spark", "ring", "shortcut"];
export function spanFits(chart: ChartType, span: Span): boolean {
  return FIGURES.includes(chart) || span.w * span.h >= 2;
}

/** Ajusta un tamaño a la grilla (enteros entre 1 y el maximo) y a lo que necesita el grafico. */
export function clampSpan(chart: ChartType, span: Span): Span {
  const w = Math.min(GRID.cols, Math.max(1, Math.round(span.w)));
  const h = Math.min(GRID.maxRows, Math.max(1, Math.round(span.h)));
  if (spanFits(chart, { w, h })) return { w, h };
  // 1x1 en un grafico: crece hacia donde tenga mas sentido.
  return chart === "list" || chart === "table" || chart === "donut" || chart === "hbar" || chart === "files" ? { w: 2, h: 2 } : { w: 2, h: 1 };
}

// ---------------------------------------------------------------------------
// Metricas
// ---------------------------------------------------------------------------

export const GROUPS = ["agenda", "pacientes", "finanzas", "tratamientos", "clinico", "crm", "equipo", "herramientas"] as const;
export type MetricGroup = (typeof GROUPS)[number];

export const GROUP_LABEL: Record<MetricGroup, string> = {
  agenda: "Agenda y citas",
  pacientes: "Pacientes",
  finanzas: "Finanzas y caja",
  tratamientos: "Tratamientos",
  clinico: "Atención clínica",
  crm: "CRM y comunicación",
  equipo: "Equipo y operación",
  herramientas: "Herramientas",
};

export type Unit = "count" | "money" | "percent" | "hours" | "minutes";

/**
 * trend: una cifra del periodo, la del periodo anterior y su evolucion por tramo.
 * snapshot: una cifra de "ahora" que no depende del periodo.
 * breakdown: el total repartido en categorias.
 * list: filas (agenda de hoy, seguimientos vencidos...).
 * tool: no es una metrica; el widget guarda su propio contenido (archivos, acceso directo).
 */
export type MetricShape = "trend" | "snapshot" | "breakdown" | "list" | "tool";

export type MetricDef = {
  id: string;
  label: string;
  group: MetricGroup;
  description: string;
  unit: Unit;
  shape: MetricShape;
  defaultChart: ChartType;
  /** false cuando subir es malo (inasistencias, cobros pendientes...): cambia el color de la variacion. */
  higherIsBetter?: boolean;
  /** Ruta de la app donde se ve el detalle. */
  href?: string;
};

const m = (def: MetricDef) => def;

export const METRICS: MetricDef[] = [
  // Agenda y citas
  m({ id: "appointments", label: "Citas agendadas", group: "agenda", unit: "count", shape: "trend", defaultChart: "area", href: "/agenda", description: "Citas del periodo, sin contar las canceladas." }),
  m({ id: "appointments_completed", label: "Atenciones realizadas", group: "agenda", unit: "count", shape: "trend", defaultChart: "bar", href: "/agenda", description: "Citas que terminaron como completadas." }),
  m({ id: "attendance_rate", label: "Tasa de asistencia", group: "agenda", unit: "percent", shape: "trend", defaultChart: "ring", description: "Completadas sobre completadas más inasistencias." }),
  m({ id: "no_show_rate", label: "Inasistencias", group: "agenda", unit: "percent", shape: "trend", defaultChart: "spark", higherIsBetter: false, description: "Pacientes que no llegaron, sobre las citas que ya pasaron." }),
  m({ id: "cancellation_rate", label: "Cancelaciones", group: "agenda", unit: "percent", shape: "trend", defaultChart: "spark", higherIsBetter: false, description: "Citas canceladas sobre todas las citas del periodo." }),
  m({ id: "confirmation_rate", label: "Citas confirmadas", group: "agenda", unit: "percent", shape: "trend", defaultChart: "ring", description: "Confirmadas o completadas sobre las citas no canceladas." }),
  m({ id: "online_bookings", label: "Reservas online", group: "agenda", unit: "count", shape: "trend", defaultChart: "spark", href: "/configuracion", description: "Citas que el paciente reservó solo, desde el link o el portal." }),
  m({ id: "appointments_by_status", label: "Estado de las citas", group: "agenda", unit: "count", shape: "breakdown", defaultChart: "donut", description: "Agendadas, confirmadas, completadas, canceladas e inasistencias." }),
  m({ id: "appointments_by_source", label: "Origen de las citas", group: "agenda", unit: "count", shape: "breakdown", defaultChart: "donut", description: "Reservas online frente a citas agendadas por el equipo." }),
  m({ id: "appointments_by_doctor", label: "Citas por profesional", group: "agenda", unit: "count", shape: "breakdown", defaultChart: "hbar", description: "Ocupación de cada profesional en el periodo." }),
  m({ id: "hours_by_box", label: "Horas reservadas por box", group: "agenda", unit: "hours", shape: "breakdown", defaultChart: "hbar", href: "/boxes", description: "Uso de cada box, en horas de cita." }),
  m({ id: "appointments_by_weekday", label: "Días con más citas", group: "agenda", unit: "count", shape: "breakdown", defaultChart: "bar", description: "Citas no canceladas por día de la semana." }),
  m({ id: "appointments_by_hour", label: "Horas punta", group: "agenda", unit: "count", shape: "breakdown", defaultChart: "bar", description: "Citas no canceladas por hora de inicio." }),
  m({ id: "arrivals", label: "Llegadas a sala", group: "agenda", unit: "count", shape: "trend", defaultChart: "spark", description: "Pacientes que recepción marcó como llegados." }),
  m({ id: "arrival_delay", label: "Atraso promedio de llegada", group: "agenda", unit: "minutes", shape: "trend", defaultChart: "spark", higherIsBetter: false, description: "Minutos entre la hora de la cita y la llegada (0 si llegó antes)." }),
  m({ id: "agenda_today", label: "Agenda de hoy", group: "agenda", unit: "count", shape: "list", defaultChart: "list", href: "/agenda", description: "Citas de hoy en orden de hora, con su estado." }),

  // Pacientes
  m({ id: "new_patients", label: "Pacientes nuevos", group: "pacientes", unit: "count", shape: "trend", defaultChart: "spark", href: "/patients", description: "Fichas creadas en el periodo." }),
  m({ id: "active_patients", label: "Pacientes activos", group: "pacientes", unit: "count", shape: "snapshot", defaultChart: "kpi", href: "/patients", description: "Pacientes con ficha activa hoy." }),
  m({ id: "attended_patients", label: "Pacientes atendidos", group: "pacientes", unit: "count", shape: "trend", defaultChart: "line", description: "Pacientes distintos con al menos una atención completada." }),
  m({ id: "returning_rate", label: "Pacientes que vuelven", group: "pacientes", unit: "percent", shape: "trend", defaultChart: "ring", description: "Atendidos que ya se habían atendido antes en la sede." }),
  m({ id: "patients_by_gender", label: "Pacientes por género", group: "pacientes", unit: "count", shape: "breakdown", defaultChart: "donut", description: "Pacientes activos según el género de la ficha." }),
  m({ id: "patients_by_age", label: "Pacientes por edad", group: "pacientes", unit: "count", shape: "breakdown", defaultChart: "bar", description: "Pacientes activos por tramo de edad." }),
  m({ id: "portal_accounts", label: "Cuentas del portal", group: "pacientes", unit: "count", shape: "trend", defaultChart: "spark", href: "/portal-paciente", description: "Pacientes que crearon su cuenta en el portal." }),

  // Finanzas y caja
  m({ id: "revenue", label: "Ingresos cobrados", group: "finanzas", unit: "money", shape: "trend", defaultChart: "area", description: "Pagos de pacientes registrados como pagados." }),
  m({ id: "pending_payments", label: "Cobros pendientes", group: "finanzas", unit: "money", shape: "trend", defaultChart: "spark", higherIsBetter: false, description: "Pagos de pacientes que siguen pendientes." }),
  m({ id: "avg_ticket", label: "Ticket promedio", group: "finanzas", unit: "money", shape: "trend", defaultChart: "spark", description: "Monto promedio de cada pago cobrado." }),
  m({ id: "revenue_by_treatment", label: "Ingresos por tratamiento", group: "finanzas", unit: "money", shape: "breakdown", defaultChart: "hbar", description: "Lo cobrado, repartido por servicio." }),
  m({ id: "revenue_by_doctor", label: "Ingresos por profesional", group: "finanzas", unit: "money", shape: "breakdown", defaultChart: "hbar", description: "Lo cobrado en citas de cada profesional." }),
  m({ id: "payment_status", label: "Estado de pago de las citas", group: "finanzas", unit: "count", shape: "breakdown", defaultChart: "donut", description: "Citas no canceladas pagadas, pendientes o exentas." }),
  m({ id: "cash_income", label: "Ingresos de caja", group: "finanzas", unit: "money", shape: "trend", defaultChart: "bar", description: "Ingresos registrados en la caja diaria." }),
  m({ id: "cash_expense", label: "Egresos de caja", group: "finanzas", unit: "money", shape: "trend", defaultChart: "bar", higherIsBetter: false, description: "Gastos registrados en la caja diaria." }),
  m({ id: "cash_net", label: "Saldo de caja", group: "finanzas", unit: "money", shape: "trend", defaultChart: "line", description: "Ingresos menos egresos de la caja." }),
  m({ id: "payouts", label: "Honorarios de profesionales", group: "finanzas", unit: "money", shape: "trend", defaultChart: "bar", href: "/liquidaciones", description: "Líquido a pagar en las boletas de honorarios de los meses del periodo." }),
  m({ id: "invoices_by_status", label: "Boletas de honorarios", group: "finanzas", unit: "count", shape: "breakdown", defaultChart: "donut", href: "/liquidaciones", description: "Boletas de los meses del periodo por estado." }),

  // Tratamientos
  m({ id: "treatments_performed", label: "Prestaciones realizadas", group: "tratamientos", unit: "count", shape: "trend", defaultChart: "bar", href: "/treatments", description: "Tratamientos registrados a pacientes." }),
  m({ id: "top_treatments", label: "Tratamientos más realizados", group: "tratamientos", unit: "count", shape: "breakdown", defaultChart: "hbar", href: "/treatments", description: "Los servicios que más se hicieron en el periodo." }),
  m({ id: "fonasa_codes", label: "Prestaciones por código Fonasa", group: "tratamientos", unit: "count", shape: "breakdown", defaultChart: "table", description: "Prestaciones con código Fonasa MLE, agrupadas por código." }),
  m({ id: "new_plans", label: "Planes de tratamiento nuevos", group: "tratamientos", unit: "count", shape: "trend", defaultChart: "spark", href: "/seguimiento", description: "Planes creados en el periodo." }),
  m({ id: "plans_by_status", label: "Planes por estado", group: "tratamientos", unit: "count", shape: "breakdown", defaultChart: "donut", href: "/seguimiento", description: "Planes creados en el periodo: activos, completados y cancelados." }),
  m({ id: "active_plans", label: "Planes activos", group: "tratamientos", unit: "count", shape: "snapshot", defaultChart: "kpi", href: "/seguimiento", description: "Planes de tratamiento en curso hoy." }),

  // Atencion clinica
  m({ id: "clinical_visits", label: "Citas clínicas iniciadas", group: "clinico", unit: "count", shape: "trend", defaultChart: "line", href: "/clinical-visits", description: "Atenciones abiertas en la consulta guiada." }),
  m({ id: "clinical_records", label: "Registros clínicos", group: "clinico", unit: "count", shape: "trend", defaultChart: "bar", description: "Formularios clínicos completados en la ficha." }),
  m({ id: "observations", label: "Mediciones registradas", group: "clinico", unit: "count", shape: "trend", defaultChart: "spark", description: "Signos vitales y otras observaciones (HL7 FHIR)." }),
  m({ id: "imaging", label: "Exámenes e imágenes", group: "clinico", unit: "count", shape: "trend", defaultChart: "spark", description: "Exámenes e imágenes subidos a la ficha." }),
  m({ id: "imaging_by_status", label: "Exámenes por estado", group: "clinico", unit: "count", shape: "breakdown", defaultChart: "donut", description: "Exámenes del periodo según su estado." }),

  // CRM y comunicacion
  m({ id: "new_leads", label: "Leads nuevos", group: "crm", unit: "count", shape: "trend", defaultChart: "spark", href: "/crm", description: "Contactos que entraron al CRM." }),
  m({ id: "lead_conversion", label: "Conversión de leads", group: "crm", unit: "percent", shape: "trend", defaultChart: "ring", href: "/crm", description: "Leads del periodo que ya pasaron a paciente." }),
  m({ id: "leads_by_channel", label: "Leads por canal", group: "crm", unit: "count", shape: "breakdown", defaultChart: "donut", href: "/crm", description: "Por dónde llegaron los leads del periodo." }),
  m({ id: "pipeline_by_stage", label: "Pipeline por etapa", group: "crm", unit: "count", shape: "breakdown", defaultChart: "hbar", href: "/crm", description: "Leads abiertos hoy en cada columna del CRM." }),
  m({ id: "leads_by_temperature", label: "Leads por temperatura IA", group: "crm", unit: "count", shape: "breakdown", defaultChart: "donut", href: "/crm", description: "Leads abiertos según la temperatura que asignó la IA." }),
  m({ id: "pipeline_value", label: "Valor del pipeline", group: "crm", unit: "money", shape: "snapshot", defaultChart: "kpi", href: "/crm", description: "Suma del presupuesto estimado de los leads abiertos." }),
  m({ id: "overdue_followups", label: "Seguimientos vencidos", group: "crm", unit: "count", shape: "list", defaultChart: "list", href: "/crm", description: "Leads abiertos con la fecha de seguimiento ya pasada." }),
  m({ id: "crm_messages", label: "Mensajes del CRM", group: "crm", unit: "count", shape: "trend", defaultChart: "bar", href: "/crm", description: "Mensajes enviados y recibidos con los leads." }),
  m({ id: "messages_by_direction", label: "Mensajes recibidos y enviados", group: "crm", unit: "count", shape: "breakdown", defaultChart: "donut", href: "/crm", description: "Cuántos mensajes llegaron y cuántos respondió el equipo." }),

  // Equipo y operacion
  m({ id: "professionals", label: "Profesionales activos", group: "equipo", unit: "count", shape: "snapshot", defaultChart: "kpi", href: "/usuarios", description: "Profesionales con acceso activo a la sede." }),
  m({ id: "hours_by_doctor", label: "Horas atendidas por profesional", group: "equipo", unit: "hours", shape: "breakdown", defaultChart: "hbar", description: "Horas de citas completadas de cada profesional." }),
  m({ id: "alerts_by_type", label: "Alertas internas por tipo", group: "equipo", unit: "count", shape: "breakdown", defaultChart: "hbar", href: "/notifications", description: "Choques, llegadas, cobros, cancelaciones y otras alertas del periodo." }),
  m({ id: "pending_vacations", label: "Vacaciones por aprobar", group: "equipo", unit: "count", shape: "list", defaultChart: "list", href: "/vacaciones", description: "Solicitudes de vacaciones que esperan respuesta." }),
];

// Herramientas: no se calculan en el servidor, guardan su contenido en el propio widget.
METRICS.push(
  m({ id: "files", label: "Archivos", group: "herramientas", unit: "count", shape: "tool", defaultChart: "files", description: "Sube imágenes, PDF, planillas y otros archivos para tenerlos a mano en el panel." }),
  m({ id: "shortcut", label: "Acceso directo", group: "herramientas", unit: "count", shape: "tool", defaultChart: "shortcut", description: "Un botón con icono hacia la sección que más usas." })
);

export const METRIC_BY_ID = new Map(METRICS.map((def) => [def.id, def]));

/** Las herramientas no piden datos al servidor. */
export const isTool = (metric: string) => METRIC_BY_ID.get(metric)?.shape === "tool";

/** Graficos que admite una metrica, segun lo que devuelve. */
export function chartsFor(def: MetricDef): ChartType[] {
  switch (def.shape) {
    case "trend":
      return def.unit === "percent"
        ? ["ring", "kpi", "spark", "line", "area", "bar", "table"]
        : ["kpi", "spark", "line", "area", "bar", "table"];
    case "snapshot":
      return ["kpi"];
    case "breakdown":
      return ["donut", "hbar", "bar", "table", "kpi"];
    case "list":
      return ["list"];
    case "tool":
      return [def.defaultChart];
  }
}

/** Solo las cifras se pueden medir contra una meta. */
export const supportsGoal = (def: MetricDef) => def.shape === "trend" || def.shape === "snapshot";

// ---------------------------------------------------------------------------
// Resultado de una metrica (lo que devuelve /api/dashboard/widgets)
// ---------------------------------------------------------------------------

export type SeriesPoint = { label: string; value: number };
export type BreakdownItem = { label: string; value: number; color?: string };
export type ListRow = { id: string; primary: string; secondary?: string; meta?: string; status?: { label: string; tone: "ok" | "warn" | "off" | "err" | "info" } };

export type MetricResult =
  | { shape: "trend"; value: number; previous: number | null; series: SeriesPoint[] }
  | { shape: "snapshot"; value: number }
  | { shape: "breakdown"; total: number; items: BreakdownItem[] }
  | { shape: "list"; total: number; rows: ListRow[] };

// ---------------------------------------------------------------------------
// Diseño guardado
// ---------------------------------------------------------------------------

export type WidgetConfig = {
  id: string;
  metric: string;
  chart: ChartType;
  /** Ancho en columnas (1 a 4) y alto en filas (1 a 4). En pantallas angostas el ancho se limita a la grilla. */
  w: number;
  h: number;
  /**
   * Celda fija en la grilla de escritorio (columna 0 a 3, fila desde 0). La tiene un widget que se solto
   * en un espacio en blanco; los demas fluyen en orden alrededor. null o ausente: sigue el orden.
   */
  x?: number | null;
  y?: number | null;
  /** Periodo propio del widget; null usa el del panel. */
  period: PeriodKey | null;
  title: string | null;
  /** Meta para el semaforo (solo cifras). */
  goal: number | null;
  /** Icono elegido por el admin. Ausente o null: el icono por defecto de la metrica. */
  icon?: WidgetIcon | null;
  /** Widget "Archivos": lo que se subio. */
  files?: StoredFile[];
  /** Widget "Archivos": visor grande (imagenes y PDF de a uno) o lista. Ausente: visor si hay algo que mostrar. */
  filesView?: "viewer" | "list";
  /** Widget "Acceso directo": a donde lleva. */
  link?: { href: string; label: string } | null;
};

export const ICON_COLORS = ["turquesa", "oscuro", "marino", "aqua", "ambar", "rojo", "gris"] as const;
export type IconColor = (typeof ICON_COLORS)[number];
export const ICON_SIZES = ["sm", "md", "lg"] as const;
export type IconSize = (typeof ICON_SIZES)[number];
/** name: nombre de un icono de Lucide en kebab-case ("calendar-check"). */
export type WidgetIcon = { name: string; color: IconColor; size: IconSize };

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_WIDGET = 50;
/** local: en el disco del servidor (desarrollo). cloudinary: en la nube, como el resto de archivos del SaaS. */
export type StoredFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  storage: "local" | "cloudinary";
  /** Ruta en el disco o public_id de Cloudinary, para reemplazar y borrar. */
  key: string;
  resourceType?: "image" | "raw" | "video";
  uploadedAt: string;
  /** Se muestra en miniatura dentro del widget (imagenes y PDF). */
  pinned?: boolean;
};

export type DashboardLayout = { version: 3; period: PeriodKey; widgets: WidgetConfig[] };

export const MAX_WIDGETS = 40;

const widgetBase = {
  id: z.string().min(1).max(40),
  metric: z.string().refine((id) => METRIC_BY_ID.has(id), "Métrica desconocida."),
  chart: z.enum(CHARTS),
  period: z.enum(PERIODS).nullable(),
  title: z.string().trim().max(80).nullable(),
  goal: z.number().finite().nullable(),
};

const iconSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]{1,60}$/),
  color: z.enum(ICON_COLORS),
  size: z.enum(ICON_SIZES),
});
const fileSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(160),
  mime: z.string().max(120),
  size: z.number().int().min(0).max(MAX_FILE_BYTES),
  url: z.string().max(600),
  storage: z.enum(["local", "cloudinary"]),
  key: z.string().max(400),
  resourceType: z.enum(["image", "raw", "video"]).optional(),
  uploadedAt: z.string().max(40),
  pinned: z.boolean().optional(),
});
const linkSchema = z.object({ href: z.string().regex(/^\/[\w\-/]*$/).max(120), label: z.string().trim().min(1).max(60) });

const widgetSchema = z.object({
  ...widgetBase,
  icon: iconSchema.nullable().optional(),
  files: z.array(fileSchema).max(MAX_FILES_PER_WIDGET).optional(),
  filesView: z.enum(["viewer", "list"]).optional(),
  link: linkSchema.nullable().optional(),
  w: z.number().int().min(1).max(GRID.cols),
  h: z.number().int().min(1).max(GRID.maxRows),
  x: z.number().int().min(0).max(GRID.cols - 1).nullable().optional(),
  y: z.number().int().min(0).max(200).nullable().optional(),
});

export const layoutSchema = z.object({
  version: z.literal(3),
  period: z.enum(PERIODS),
  widgets: z.array(widgetSchema).max(MAX_WIDGETS),
});

/** Version 1: ancho de 1 a 12 columnas y alto libre. */
const v1WidgetSchema = z.object({ ...widgetBase, w: z.number().int().min(1).max(12), h: z.number().int().min(1).max(8) });
/** Version 2: tamaños fijos con nombre. */
const v2WidgetSchema = z.object({ ...widgetBase, size: z.enum(["s", "m", "l", "full", "xl"]) });

/** Ajusta un widget a lo que admite su metrica: grafico valido y un tamaño que ese grafico admita. */
export function normalizeWidget(widget: WidgetConfig): WidgetConfig {
  const def = METRIC_BY_ID.get(widget.metric);
  if (!def) return widget;
  const charts = chartsFor(def);
  const chart = charts.includes(widget.chart) ? widget.chart : def.defaultChart;
  const span = clampSpan(chart, widget);
  // Una celda fija que ya no cabe a lo ancho se descarta: el widget vuelve a fluir en orden.
  const pinned = widget.x != null && widget.y != null && widget.x + span.w <= GRID.cols;
  return { ...widget, chart, ...span, x: pinned ? widget.x : null, y: pinned ? widget.y : null, goal: supportsGoal(def) ? widget.goal : null };
}

/**
 * Lee un diseño guardado de cualquier version. Los widgets que ya no son validos (metrica eliminada,
 * datos rotos) se descartan en vez de romper el panel. Devuelve null si no hay nada aprovechable.
 */
export function readLayout(raw: unknown): DashboardLayout | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { widgets?: unknown }).widgets)) return null;
  const version = (raw as { version?: unknown }).version;
  const period = z.enum(PERIODS).safeParse((raw as { period?: unknown }).period);
  const widgets: WidgetConfig[] = [];
  for (const item of (raw as { widgets: unknown[] }).widgets.slice(0, MAX_WIDGETS)) {
    if (version === 1) {
      const v1 = v1WidgetSchema.safeParse(item);
      if (!v1.success) continue;
      // 12 columnas -> 4 (tres por columna) y alto: hasta 3 filas viejas es 1, hasta 5 son 2.
      const { w, h, ...rest } = v1.data;
      widgets.push(normalizeWidget({ ...rest, w: Math.round(w / 3), h: h >= 6 ? 3 : h >= 4 ? 2 : 1 }));
      continue;
    }
    if (version === 2) {
      const v2 = v2WidgetSchema.safeParse(item);
      if (!v2.success) continue;
      const { size, ...rest } = v2.data;
      const preset = PRESETS.find((p) => p.id === size)!;
      widgets.push(normalizeWidget({ ...rest, w: preset.w, h: preset.h }));
      continue;
    }
    const current = widgetSchema.safeParse(item);
    if (current.success) widgets.push(normalizeWidget(current.data));
  }
  return { version: 3, period: period.success ? period.data : "month", widgets };
}

/** Tamaño con que entra un widget nuevo de cada grafico. */
export const DEFAULT_SPAN: Record<ChartType, Span> = {
  kpi: { w: 1, h: 1 },
  spark: { w: 2, h: 1 },
  ring: { w: 1, h: 1 },
  line: { w: 2, h: 2 },
  area: { w: 4, h: 1 },
  bar: { w: 2, h: 2 },
  hbar: { w: 2, h: 2 },
  donut: { w: 2, h: 2 },
  table: { w: 2, h: 2 },
  list: { w: 2, h: 2 },
  files: { w: 2, h: 2 },
  shortcut: { w: 1, h: 1 },
};

let seq = 0;
export function newWidget(metric: string, chart?: ChartType, span?: Span): WidgetConfig {
  const def = METRIC_BY_ID.get(metric);
  const type = chart ?? def?.defaultChart ?? "kpi";
  seq += 1;
  return normalizeWidget({
    id: `w${Date.now().toString(36)}${seq}`,
    metric,
    chart: type,
    ...(span ?? DEFAULT_SPAN[type]),
    x: null,
    y: null,
    period: null,
    title: null,
    goal: null,
  });
}

const w = (id: string, metric: string, chart: ChartType, cols: number, rows: number): WidgetConfig => ({
  id,
  metric,
  chart,
  w: cols,
  h: rows,
  x: null,
  y: null,
  period: null,
  title: null,
  goal: null,
});

/** Lo que ve un admin la primera vez: las cifras de la demo y lo mas pedido del tablero. */
export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 3,
  period: "month",
  widgets: [
    w("d1", "appointments", "spark", 2, 1),
    w("d2", "revenue", "spark", 2, 1),
    w("d3", "new_patients", "kpi", 1, 1),
    w("d4", "new_leads", "kpi", 1, 1),
    w("d5", "attendance_rate", "ring", 1, 1),
    w("d6", "no_show_rate", "kpi", 1, 1),
    w("d7", "appointments", "area", 2, 2),
    w("d8", "appointments_by_status", "donut", 2, 2),
    w("d9", "agenda_today", "list", 2, 2),
    w("d10", "appointments_by_doctor", "hbar", 2, 2),
    w("d11", "revenue_by_treatment", "hbar", 4, 1),
    w("d12", "pipeline_by_stage", "hbar", 2, 2),
    w("d13", "cash_net", "line", 2, 2),
  ],
};

// ---------------------------------------------------------------------------
// Funciones del mapa de Miro que todavia no tienen datos en el sistema
// ---------------------------------------------------------------------------

export type UpcomingMetric = { label: string; group: MetricGroup; needs: string; plan: "Basic" | "Pro" | "Enterprise" | "Add-on" };

export const UPCOMING: UpcomingMetric[] = [
  { label: "Lista de espera y cupos recuperados", group: "agenda", needs: "Lista de espera", plan: "Pro" },
  { label: "Confirmaciones por WhatsApp", group: "agenda", needs: "Plantillas de WhatsApp Cloud", plan: "Pro" },
  { label: "Citas reagendadas por el paciente", group: "agenda", needs: "Autogestión de citas", plan: "Pro" },
  { label: "Atenciones por telemedicina", group: "agenda", needs: "Telemedicina", plan: "Pro" },
  { label: "Citas recurrentes y grupales", group: "agenda", needs: "Citas recurrentes y grupales", plan: "Pro" },
  { label: "Satisfacción NPS por profesional", group: "pacientes", needs: "Encuestas después de la atención", plan: "Pro" },
  { label: "Panel de reseñas de Google", group: "pacientes", needs: "Solicitud de reseñas", plan: "Pro" },
  { label: "Consentimientos firmados y pendientes", group: "pacientes", needs: "Firma desde el celular", plan: "Pro" },
  { label: "Boletas electrónicas del SII emitidas", group: "finanzas", needs: "Boleta al cobrar", plan: "Pro" },
  { label: "Pagos en línea y links de pago", group: "finanzas", needs: "Transbank o Mercado Pago", plan: "Pro" },
  { label: "Gastos por centro de costo", group: "finanzas", needs: "Centros de costo", plan: "Pro" },
  { label: "Proyección del flujo de caja a 30 días", group: "finanzas", needs: "Proyección de caja", plan: "Pro" },
  { label: "Arqueo por caja y turno", group: "finanzas", needs: "Caja por usuario y turno", plan: "Pro" },
  { label: "Ventas por convenio", group: "finanzas", needs: "Convenios y tarifarios", plan: "Pro" },
  { label: "Facturas y notas de crédito", group: "finanzas", needs: "Integración con facturadores", plan: "Pro" },
  { label: "Stock de insumos y vencimientos", group: "tratamientos", needs: "Inventario", plan: "Enterprise" },
  { label: "Ejercicios asignados y cumplidos", group: "tratamientos", needs: "Tabla de ejercicios", plan: "Pro" },
  { label: "Órdenes y resultados de laboratorio", group: "clinico", needs: "Laboratorios integrados", plan: "Pro" },
  { label: "Recetas emitidas", group: "clinico", needs: "Recetas con vademécum", plan: "Pro" },
  { label: "Eventos adversos", group: "clinico", needs: "Registro de eventos adversos", plan: "Enterprise" },
  { label: "Reporte REM del Minsal", group: "clinico", needs: "Exportación REM", plan: "Enterprise" },
  { label: "Notas IA y resúmenes clínicos usados", group: "clinico", needs: "Registro de uso de la IA", plan: "Add-on" },
  { label: "Tiempo de respuesta (SLA) por canal", group: "crm", needs: "SLA de respuesta", plan: "Pro" },
  { label: "Mensajes por WhatsApp e Instagram", group: "crm", needs: "Bandeja omnicanal", plan: "Pro" },
  { label: "Campañas que traen pacientes", group: "crm", needs: "Campañas con seguimiento", plan: "Pro" },
  { label: "Aperturas de email marketing", group: "crm", needs: "Email marketing", plan: "Enterprise" },
  { label: "Conversaciones del Contact Center IA", group: "crm", needs: "Contact Center IA", plan: "Add-on" },
  { label: "Mantenciones de equipos médicos", group: "equipo", needs: "Equipos y mantenciones", plan: "Pro" },
  { label: "Ejecuciones y fallos de las automatizaciones", group: "equipo", needs: "Reglas automáticas", plan: "Enterprise" },
  { label: "Pendientes detectados por el Contralor IA", group: "equipo", needs: "Contralor IA", plan: "Add-on" },
];
