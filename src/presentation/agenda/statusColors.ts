export const COLOR_NAMES = [
  "blue",
  "indigo",
  "emerald",
  "rose",
  "amber",
  "violet",
  "cyan",
  "teal",
  "pink",
  "orange",
  "slate",
] as const;

export type ColorName = (typeof COLOR_NAMES)[number];

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
};

export type StatusColorMap = Partial<Record<AppointmentStatus, ColorName>>;

export const DEFAULT_STATUS_COLORS: Record<AppointmentStatus, ColorName> = {
  SCHEDULED: "blue",
  CONFIRMED: "indigo",
  CANCELLED: "slate",
  COMPLETED: "emerald",
  NO_SHOW: "rose",
};

export type CardColorClasses = {
  card: string;
  time: string;
  badge: string;
  shadow: string;
};

// All class strings are written literally so Tailwind includes them at build time.
export const COLOR_CLASS_MAP: Record<ColorName, CardColorClasses> = {
  blue: {
    card: "border-blue-100/80 bg-blue-50/90 hover:border-blue-200 hover:bg-blue-100/70",
    time: "text-blue-400",
    badge: "bg-blue-200/80 text-blue-700",
    shadow: "hover:shadow-blue-100/60",
  },
  indigo: {
    card: "border-indigo-100/80 bg-indigo-50/90 hover:border-indigo-200 hover:bg-indigo-100/70",
    time: "text-indigo-400",
    badge: "bg-indigo-200/80 text-indigo-700",
    shadow: "hover:shadow-indigo-100/60",
  },
  emerald: {
    card: "border-emerald-100/80 bg-emerald-50/90 hover:border-emerald-200 hover:bg-emerald-100/70",
    time: "text-emerald-400",
    badge: "bg-emerald-200/80 text-emerald-700",
    shadow: "hover:shadow-emerald-100/60",
  },
  rose: {
    card: "border-rose-100/80 bg-rose-50/90 hover:border-rose-200 hover:bg-rose-100/70",
    time: "text-rose-400",
    badge: "bg-rose-200/80 text-rose-700",
    shadow: "hover:shadow-rose-100/60",
  },
  amber: {
    card: "border-amber-100/80 bg-amber-50/90 hover:border-amber-200 hover:bg-amber-100/70",
    time: "text-amber-400",
    badge: "bg-amber-200/80 text-amber-700",
    shadow: "hover:shadow-amber-100/60",
  },
  violet: {
    card: "border-violet-100/80 bg-violet-50/90 hover:border-violet-200 hover:bg-violet-100/70",
    time: "text-violet-400",
    badge: "bg-violet-200/80 text-violet-700",
    shadow: "hover:shadow-violet-100/60",
  },
  cyan: {
    card: "border-cyan-100/80 bg-cyan-50/90 hover:border-cyan-200 hover:bg-cyan-100/70",
    time: "text-cyan-400",
    badge: "bg-cyan-200/80 text-cyan-700",
    shadow: "hover:shadow-cyan-100/60",
  },
  teal: {
    card: "border-teal-100/80 bg-teal-50/90 hover:border-teal-200 hover:bg-teal-100/70",
    time: "text-teal-400",
    badge: "bg-teal-200/80 text-teal-700",
    shadow: "hover:shadow-teal-100/60",
  },
  pink: {
    card: "border-pink-100/80 bg-pink-50/90 hover:border-pink-200 hover:bg-pink-100/70",
    time: "text-pink-400",
    badge: "bg-pink-200/80 text-pink-700",
    shadow: "hover:shadow-pink-100/60",
  },
  orange: {
    card: "border-orange-100/80 bg-orange-50/90 hover:border-orange-200 hover:bg-orange-100/70",
    time: "text-orange-400",
    badge: "bg-orange-200/80 text-orange-700",
    shadow: "hover:shadow-orange-100/60",
  },
  slate: {
    card: "border-slate-200/80 bg-slate-50/90 hover:border-slate-300 hover:bg-slate-100/70",
    time: "text-slate-400",
    badge: "bg-slate-200/80 text-slate-600",
    shadow: "hover:shadow-slate-100/60",
  },
};

export const SWATCH_CLASSES: Record<ColorName, string> = {
  blue: "bg-blue-400",
  indigo: "bg-indigo-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  teal: "bg-teal-400",
  pink: "bg-pink-400",
  orange: "bg-orange-400",
  slate: "bg-slate-400",
};

export const COLOR_LABELS: Record<ColorName, string> = {
  blue: "Azul",
  indigo: "Índigo",
  emerald: "Esmeralda",
  rose: "Rosa",
  amber: "Ámbar",
  violet: "Violeta",
  cyan: "Cian",
  teal: "Turquesa",
  pink: "Rosado",
  orange: "Naranja",
  slate: "Gris",
};

export function resolveStatusColors(
  dbOverrides?: StatusColorMap | null
): Record<AppointmentStatus, ColorName> {
  if (!dbOverrides) return { ...DEFAULT_STATUS_COLORS };
  return { ...DEFAULT_STATUS_COLORS, ...dbOverrides };
}

export function getCardClasses(
  status: string,
  colorMap: Record<AppointmentStatus, ColorName>
): CardColorClasses {
  const colorName = colorMap[status as AppointmentStatus] ?? "blue";
  return COLOR_CLASS_MAP[colorName];
}
