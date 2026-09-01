import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Stethoscope,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  ConsultationSectionKey,
  ConsultationVitalKey,
} from "@/domain/consultations/entities/Consultation";

/** Paleta corporativa. Se centraliza aca para no repetir el hex por toda la UI. */
export const BRAND = {
  base: "#19b3bc",
  deep: "#0f8f98",
  hover: "#159ea7",
  mist: "#e9f7f8",
} as const;

export type ConsultationStageKey =
  | "intake"
  | "vitals"
  | "assessment"
  | "records"
  | "diagnosis"
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
