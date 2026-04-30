import type { UserPermission } from "@/lib/permissions";

export type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "SECRETARY";

export const ROLE_LABELS: Record<PlatformRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin Clinica",
  DOCTOR: "Medico",
  SECRETARY: "Recepcionista",
};

export const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  SUPER_ADMIN: "Acceso total a la plataforma",
  ADMIN: "Gestion operativa de una clinica",
  DOCTOR: "Agenda, pacientes y atencion clinica",
  SECRETARY: "Agenda, pacientes y recepcion",
};

export const PLATFORM_MODULES: Array<{
  key: UserPermission;
  slug: string;
  label: string;
  description: string;
  category: "core" | "growth" | "ops";
}> = [
  {
    key: "AGENDA",
    slug: "agenda",
    label: "Agenda",
    description: "Citas, horarios y estados de atencion",
    category: "core",
  },
  {
    key: "PATIENTS",
    slug: "pacientes",
    label: "Pacientes",
    description: "Historial y ficha administrativa",
    category: "core",
  },
  {
    key: "CLINICAL_VISITS",
    slug: "citas-clinicas",
    label: "Cita clinica",
    description: "Atencion, evoluciones y registros clinicos",
    category: "core",
  },
  {
    key: "LEADS",
    slug: "crm",
    label: "CRM",
    description: "Pipeline comercial y seguimiento de leads",
    category: "growth",
  },
  {
    key: "CHAT",
    slug: "chat",
    label: "Mensajeria",
    description: "Comunicacion interna del equipo",
    category: "ops",
  },
  {
    key: "CHAT_META",
    slug: "meta",
    label: "Meta Chat",
    description: "Conversaciones desde canales Meta",
    category: "growth",
  },
  {
    key: "USERS",
    slug: "usuarios",
    label: "Usuarios",
    description: "Administracion de perfiles y permisos",
    category: "ops",
  },
  {
    key: "TREATMENTS",
    slug: "tratamientos",
    label: "Tratamientos",
    description: "Catalogo de prestaciones y precios",
    category: "ops",
  },
  {
    key: "BOXES",
    slug: "boxes",
    label: "Boxes",
    description: "Salas, boxes y disponibilidad",
    category: "ops",
  },
  {
    key: "SEGUIMIENTO",
    slug: "seguimiento",
    label: "Seguimiento",
    description: "Control posterior a la atencion",
    category: "growth",
  },
];

export const MODULE_COLORS: Record<UserPermission, string> = {
  AGENDA: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  CLINICAL_VISITS: "bg-violet-50 text-violet-700 ring-violet-100",
  CHAT: "bg-sky-50 text-sky-700 ring-sky-100",
  CHAT_META: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  LEADS: "bg-amber-50 text-amber-700 ring-amber-100",
  PATIENTS: "bg-teal-50 text-teal-700 ring-teal-100",
  USERS: "bg-slate-100 text-slate-700 ring-slate-200",
  TREATMENTS: "bg-rose-50 text-rose-700 ring-rose-100",
  BOXES: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  SEGUIMIENTO: "bg-lime-50 text-lime-700 ring-lime-100",
};

export const MODULE_ACCENTS: Record<UserPermission, string> = {
  AGENDA: "bg-cyan-500",
  CLINICAL_VISITS: "bg-violet-500",
  CHAT: "bg-sky-500",
  CHAT_META: "bg-emerald-500",
  LEADS: "bg-amber-500",
  PATIENTS: "bg-teal-500",
  USERS: "bg-slate-500",
  TREATMENTS: "bg-rose-500",
  BOXES: "bg-indigo-500",
  SEGUIMIENTO: "bg-lime-500",
};

export function moduleLabel(key: string) {
  return PLATFORM_MODULES.find((item) => item.key === key)?.label ?? key;
}
