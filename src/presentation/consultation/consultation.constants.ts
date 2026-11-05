import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  NotebookPen,
  Stethoscope,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  ConsultationSectionKey,
  ConsultationVitalKey,
} from "@/domain/consultations/entities/Consultation";
import { NOTE_FORMATS, type AttentionTypeDef } from "@/lib/clinical/attentionTypes";

/** Paleta corporativa. Se centraliza aca para no repetir el hex por toda la UI. */
export const BRAND = {
  base: "#50c9d5",
  deep: "#1e737b",
  hover: "#45bcc8",
  mist: "#eef9fa",
} as const;

export type ConsultationStageKey =
  | "intake"
  | "vitals"
  | "assessment"
  | "records"
  | "diagnosis"
  | "module"
  | "note"
  | "closure";

export type ConsultationStageMeta = {
  key: ConsultationStageKey;
  label: string;
  /** Frase corta bajo el titulo de la etapa. */
  caption: string;
  icon: LucideIcon;
  /** Secciones narrativas que esta etapa edita. */
  sections: ConsultationSectionKey[];
  /**
   * Seccion que marca la etapa como cubierta. Null = la etapa no exige texto
   * (vitales y fichas son opcionales segun el tipo de atencion).
   */
  keySection: ConsultationSectionKey | null;
};

/**
 * Las etapas siguen el orden real de una atencion. El profesional puede saltar
 * entre ellas libremente: el orden guia, no obliga.
 */
export const CONSULTATION_STAGES: ConsultationStageMeta[] = [
  {
    key: "intake",
    label: "Recepcion",
    caption: "Identifica al paciente y registra por que viene.",
    icon: UserRoundCheck,
    sections: ["allergies", "currentMedication", "chiefComplaint"],
    keySection: "chiefComplaint",
  },
  {
    key: "vitals",
    label: "Signos vitales",
    caption: "Mediciones de hoy y su variacion respecto de la ultima consulta.",
    icon: Activity,
    sections: [],
    keySection: null,
  },
  {
    key: "assessment",
    label: "Evaluacion",
    caption: "Anamnesis y examen fisico.",
    icon: Stethoscope,
    sections: ["anamnesis", "physicalExam"],
    keySection: "anamnesis",
  },
  {
    key: "records",
    label: "Ficha clinica",
    caption: "Formularios por plantilla asociados a esta cita.",
    icon: FileText,
    sections: [],
    keySection: null,
  },
  {
    key: "diagnosis",
    label: "Diagnostico",
    caption: "Impresion diagnostica, receta e indicaciones.",
    icon: ClipboardList,
    sections: [
      "diagnosis",
      "diagnosisCode",
      "differential",
      "procedures",
      "prescription",
      "indications",
    ],
    keySection: "diagnosis",
  },
  {
    key: "closure",
    label: "Cierre",
    caption: "Proximo control, cobro y firma de la atencion.",
    icon: ClipboardCheck,
    sections: ["privateNote"],
    keySection: null,
  },
];

export const CONSULTATION_STAGE_KEYS = CONSULTATION_STAGES.map((stage) => stage.key);

const stageMeta = (key: ConsultationStageKey) => CONSULTATION_STAGES.find((stage) => stage.key === key)!;

/**
 * Etapas segun el tipo de atencion. Medicina usa las clasicas (y suma la de examenes si el tipo trae
 * bloques); las demas especialidades van: recepcion, modulo de la especialidad, nota y cierre.
 */
export function stagesFor(type: AttentionTypeDef | null): ConsultationStageMeta[] {
  const module: ConsultationStageMeta = {
    key: "module",
    label: type?.name ?? "Atencion",
    caption: type?.description || "Los datos de este tipo de atencion.",
    icon: LayoutGrid,
    sections: [],
    keySection: null,
  };
  const note: ConsultationStageMeta = {
    key: "note",
    label: type ? `Nota ${NOTE_FORMATS[type.noteFormat].label}` : "Nota",
    caption: "La evolucion de la sesion en el formato de tu especialidad.",
    icon: NotebookPen,
    sections: [],
    keySection: null,
  };
  if (!type || type.classicStages) {
    if (!type?.blocks.length) return CONSULTATION_STAGES;
    const list = [...CONSULTATION_STAGES];
    list.splice(list.findIndex((stage) => stage.key === "assessment") + 1, 0, module);
    return list;
  }
  const intake = { ...stageMeta("intake"), caption: "Motivo de consulta y antecedentes generales." };
  return [intake, ...(type.blocks.length ? [module] : []), note, stageMeta("closure")];
}

/** Signos vitales en el orden en que se toman en box. */
export const VITALS_LAYOUT: Array<{ title: string; keys: ConsultationVitalKey[] }> = [
  { title: "Hemodinamia", keys: ["systolicBp", "diastolicBp", "heartRate"] },
  { title: "Respiratorio", keys: ["respiratoryRate", "oxygenSaturation", "temperature"] },
  { title: "Antropometria", keys: ["weight", "height"] },
  { title: "Otros", keys: ["painScale", "glucose"] },
];

/** Atajos de "vuelve en...". El ultimo elemento habilita la fecha manual. */
export const FOLLOW_UP_PRESETS: Array<{ label: string; days: number }> = [
  { label: "3 dias", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
  { label: "3 meses", days: 90 },
  { label: "6 meses", days: 180 },
];

/** Frecuencias tipicas de un plan de sesiones. */
export const PLAN_FREQUENCY_PRESETS: Array<{ label: string; days: number }> = [
  { label: "Diario", days: 1 },
  { label: "2 veces/semana", days: 3 },
  { label: "Semanal", days: 7 },
  { label: "Quincenal", days: 15 },
  { label: "Mensual", days: 30 },
];

export const AUTOSAVE_DELAY_MS = 1400;
export const PRIVATE_NOTE_MAX = 1000;
