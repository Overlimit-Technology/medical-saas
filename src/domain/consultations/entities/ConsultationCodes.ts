import type { ConsultationSectionKey, ConsultationVitalKey } from "./Consultation";

/**
 * Vocabulario de la consulta. Es la unica fuente de verdad para el par
 * clave-interna <-> codigo persistido, y la comparten servidor y cliente.
 *
 * Los signos vitales usan LOINC real para que las Observation sigan siendo
 * exportables por el endpoint FHIR que ya expone la app. Las secciones
 * narrativas no tienen un equivalente LOINC directo (en FHIR serian Condition
 * o ClinicalImpression, que este modelo aun no tiene), asi que se codifican en
 * un sistema propio y quedan listas para mapearse mas adelante.
 */
export const LOINC_SYSTEM = "http://loinc.org";
export const CONSULTATION_SECTION_SYSTEM = "https://medigest.app/fhir/consultation-section";
export const VITAL_SIGNS_CATEGORY = "vital-signs";
export const OBSERVATION_CATEGORY_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/observation-category";

export type ConsultationSectionMeta = {
  code: string;
  label: string;
  /** Ayuda breve bajo el titulo; orienta que escribir sin ocupar pantalla. */
  hint: string;
  placeholder: string;
  /** Alto sugerido del textarea en filas. */
  rows: number;
  /** Se arrastra desde la consulta anterior cuando hoy esta vacio. */
  carriesOver?: boolean;
  /** Nunca sale en documentos entregados al paciente. */
  isPrivate?: boolean;
};

export const CONSULTATION_SECTIONS: Record<ConsultationSectionKey, ConsultationSectionMeta> = {
  chiefComplaint: {
    code: "chief-complaint",
    label: "Motivo de consulta",
    hint: "En palabras del paciente, que lo trae hoy.",
    placeholder: "Dolor lumbar de 3 dias, mayor al levantarse...",
    rows: 3,
  },
  anamnesis: {
    code: "anamnesis",
    label: "Anamnesis",
    hint: "Historia de la enfermedad actual y antecedentes relevantes.",
    placeholder: "Inicio, evolucion, factores que agravan o alivian, tratamientos previos...",
    rows: 6,
  },
  allergies: {
    code: "allergies",
    label: "Alergias",
    hint: "Se arrastra desde la ultima consulta que la registro.",
    placeholder: "Penicilina (rash), AINEs...",
    rows: 2,
    carriesOver: true,
  },
  currentMedication: {
    code: "current-medication",
    label: "Medicacion actual",
    hint: "Farmacos en uso, dosis y frecuencia.",
    placeholder: "Losartan 50 mg cada 24 h...",
    rows: 3,
    carriesOver: true,
  },
  physicalExam: {
    code: "physical-exam",
    label: "Examen fisico",
    hint: "Hallazgos por segmento.",
    placeholder: "Aspecto general, examen segmentario, pruebas especificas...",
    rows: 6,
  },
  diagnosis: {
    code: "diagnosis",
    label: "Diagnostico",
    hint: "Impresion diagnostica principal.",
    placeholder: "Lumbago mecanico agudo...",
    rows: 3,
  },
  diagnosisCode: {
    code: "diagnosis-code",
    label: "Codigo CIE-10",
    hint: "Opcional, para estadistica y convenios.",
    placeholder: "M54.5",
    rows: 1,
  },
  differential: {
    code: "differential",
    label: "Diagnostico diferencial",
    hint: "Que se descarto y por que.",
    placeholder: "Se descarta compromiso radicular por ausencia de...",
    rows: 3,
  },
  procedures: {
    code: "procedures",
    label: "Procedimientos realizados",
    hint: "Lo ejecutado durante esta sesion.",
    placeholder: "Infiltracion, curacion, terapia manual...",
    rows: 3,
  },
  prescription: {
    code: "prescription",
    label: "Receta",
    hint: "Farmacos indicados con dosis, via y duracion.",
    placeholder: "Ibuprofeno 400 mg cada 8 h por 5 dias, via oral...",
    rows: 5,
  },
  indications: {
    code: "indications",
    label: "Indicaciones al paciente",
    hint: "Lo que el paciente se lleva por escrito.",
    placeholder: "Reposo relativo 48 h, calor local, control si aparece fiebre...",
    rows: 5,
  },
  privateNote: {
    code: "private-note",
    label: "Nota privada",
    hint: "Solo para el equipo clinico. No se imprime en documentos del paciente.",
    placeholder: "Observaciones internas...",
    rows: 3,
    isPrivate: true,
  },
};

export type ConsultationVitalMeta = {
  code: string;
  label: string;
  /** Etiqueta compacta para tarjetas y comparativas. */
  shortLabel: string;
  unit: string;
  step: number;
  decimals: number;
  /** Limites de captura: fuera de esto es casi seguro un error de tipeo. */
  min: number;
  max: number;
  /** Rango de referencia adulto. Fuera de el se marca, no se bloquea. */
  normalMin: number | null;
  normalMax: number | null;
};

export const CONSULTATION_VITALS: Record<ConsultationVitalKey, ConsultationVitalMeta> = {
  systolicBp: {
    code: "8480-6",
    label: "Presion sistolica",
    shortLabel: "PAS",
    unit: "mmHg",
    step: 1,
    decimals: 0,
    min: 50,
    max: 260,
    normalMin: 90,
    normalMax: 129,
  },
  diastolicBp: {
    code: "8462-4",
    label: "Presion diastolica",
    shortLabel: "PAD",
    unit: "mmHg",
    step: 1,
    decimals: 0,
    min: 30,
    max: 160,
    normalMin: 60,
    normalMax: 84,
  },
  heartRate: {
    code: "8867-4",
    label: "Frecuencia cardiaca",
    shortLabel: "FC",
    unit: "lpm",
    step: 1,
    decimals: 0,
    min: 25,
    max: 230,
    normalMin: 60,
    normalMax: 100,
  },
  respiratoryRate: {
    code: "9279-1",
    label: "Frecuencia respiratoria",
    shortLabel: "FR",
    unit: "rpm",
    step: 1,
    decimals: 0,
    min: 5,
    max: 70,
    normalMin: 12,
    normalMax: 20,
  },
  temperature: {
    code: "8310-5",
    label: "Temperatura",
    shortLabel: "T",
    unit: "C",
    step: 0.1,
    decimals: 1,
    min: 30,
    max: 43,
    normalMin: 36,
    normalMax: 37.5,
  },
  oxygenSaturation: {
    code: "59408-5",
    label: "Saturacion O2",
    shortLabel: "SpO2",
    unit: "%",
    step: 1,
    decimals: 0,
    min: 50,
    max: 100,
    normalMin: 95,
    normalMax: 100,
  },
  weight: {
    code: "29463-7",
    label: "Peso",
    shortLabel: "Peso",
    unit: "kg",
    step: 0.1,
    decimals: 1,
    min: 1,
    max: 400,
    normalMin: null,
    normalMax: null,
  },
  height: {
    code: "8302-2",
    label: "Talla",
    shortLabel: "Talla",
    unit: "cm",
    step: 0.5,
    decimals: 1,
    min: 30,
    max: 250,
    normalMin: null,
    normalMax: null,
  },
  painScale: {
    code: "72514-3",
    label: "Dolor (EVA 0-10)",
    shortLabel: "EVA",
    unit: "pts",
    step: 1,
    decimals: 0,
    min: 0,
    max: 10,
    normalMin: 0,
    normalMax: 3,
  },
  glucose: {
    code: "2339-0",
    label: "Glicemia capilar",
    shortLabel: "HGT",
    unit: "mg/dL",
    step: 1,
    decimals: 0,
    min: 20,
    max: 600,
    normalMin: 70,
    normalMax: 140,
  },
};

/**
 * Desenlace del encuentro. No es un campo editable: lo escribe el cierre para
 * dejar constancia de como termino la atencion y, de paso, para que toda
 * consulta cerrada tenga al menos una observacion FINAL. Sin esa marca, una
 * consulta cerrada sin nada escrito seguiria pareciendo abierta.
 */
export const ENCOUNTER_OUTCOME_CODE = "encounter-outcome";
export const ENCOUNTER_OUTCOME_LABEL = "Desenlace de la atencion";

/** IMC calculado: no se captura, se deriva de peso y talla. */
export const BMI_META = {
  code: "39156-5",
  label: "Indice de masa corporal",
  shortLabel: "IMC",
  unit: "kg/m2",
} as const;

export const CONSULTATION_SECTION_KEYS = Object.keys(
  CONSULTATION_SECTIONS
) as ConsultationSectionKey[];

export const CONSULTATION_VITAL_KEYS = Object.keys(
  CONSULTATION_VITALS
) as ConsultationVitalKey[];

const SECTION_KEY_BY_CODE = new Map<string, ConsultationSectionKey>(
  CONSULTATION_SECTION_KEYS.map((key) => [CONSULTATION_SECTIONS[key].code, key])
);

const VITAL_KEY_BY_CODE = new Map<string, ConsultationVitalKey>(
  CONSULTATION_VITAL_KEYS.map((key) => [CONSULTATION_VITALS[key].code, key])
);

export function sectionKeyFromCode(code: string): ConsultationSectionKey | null {
  return SECTION_KEY_BY_CODE.get(code) ?? null;
}

export function vitalKeyFromCode(code: string): ConsultationVitalKey | null {
  return VITAL_KEY_BY_CODE.get(code) ?? null;
}

export function isConsultationSectionKey(value: string): value is ConsultationSectionKey {
  return value in CONSULTATION_SECTIONS;
}

export function isConsultationVitalKey(value: string): value is ConsultationVitalKey {
  return value in CONSULTATION_VITALS;
}
