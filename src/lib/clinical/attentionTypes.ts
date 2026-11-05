/**
 * Tipos de atencion por especialidad: que tarjetas ve el profesional al abrir una cita y que bloques
 * trae la ficha de cada una. Los de fabrica viven aca (clave "<especialidad>.<tipo>"); los que crea cada
 * profesional viven en la tabla AttentionType (clave "custom:<id>") con la misma forma.
 *
 * Al iniciar una consulta se copia la definicion completa a ClinicalVisit.attentionSnapshot, asi una
 * sesion antigua se sigue leyendo con la estructura con la que se registro aunque el tipo cambie despues.
 *
 * Los ids de campo son globales ("nutri.weight"): un control encuentra el valor de la primera consulta
 * por el mismo id y lo muestra al lado ("antes 93,6 kg").
 */

export type AttentionFieldKind = "text" | "longtext" | "number" | "checkbox" | "list" | "scale" | "checklist" | "date";

export type AttentionField = {
  id: string;
  label: string;
  kind: AttentionFieldKind;
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
  /** Muestra el valor de la ultima atencion al lado del campo. */
  carry?: boolean;
  /** Ancho en la grilla: "full" ocupa toda la fila. */
  width?: "half" | "full";
};

export type AttentionBlock = {
  id: string;
  title: string;
  description?: string;
  fields: AttentionField[];
};

export type NoteFormat = "soap" | "dap" | "birp" | "free";
export type AttentionKind = "first" | "followup" | "closure" | "procedure" | "other";

export type SpecialtyKey =
  | "medicina"
  | "kinesiologia"
  | "nutricion"
  | "psicologia"
  | "matroneria"
  | "terapia-ocupacional"
  | "dermo";

export type AttentionTypeDef = {
  key: string;
  specialty: SpecialtyKey;
  name: string;
  description: string;
  kind: AttentionKind;
  noteFormat: NoteFormat;
  durationMinutes: number;
  color: string;
  /** Medicina usa las etapas clasicas (signos vitales, evaluacion, diagnostico, receta). */
  classicStages?: boolean;
  blocks: AttentionBlock[];
  custom?: boolean;
  shared?: boolean;
  ownerUserId?: string;
  version?: number;
};

export const SPECIALTY_LABEL: Record<SpecialtyKey, string> = {
  medicina: "Medicina",
  kinesiologia: "Kinesiologia",
  nutricion: "Nutricion",
  psicologia: "Psicologia",
  matroneria: "Matroneria",
  "terapia-ocupacional": "Terapia ocupacional",
  dermo: "Dermatologia, podologia y estetica",
};

/** Profesion del catalogo (slug) -> especialidad de la ficha. */
const SLUG_TO_SPECIALTY: Record<string, SpecialtyKey> = {
  medico: "medicina",
  psiquiatra: "medicina",
  enfermero: "medicina",
  odontologo: "medicina",
  kinesiologo: "kinesiologia",
  nutricionista: "nutricion",
  psicologo: "psicologia",
  psicopedagogo: "psicologia",
  "trabajador-social": "psicologia",
  matron: "matroneria",
  matrona: "matroneria",
  "terapeuta-ocupacional": "terapia-ocupacional",
  fonoaudiologo: "terapia-ocupacional",
  podologo: "dermo",
};

/** Especialidad a partir de la profesion y, de respaldo, del texto libre de especialidad. */
export function specialtyFor(professionSlug?: string | null, specialtyText?: string | null): SpecialtyKey {
  if (professionSlug && SLUG_TO_SPECIALTY[professionSlug]) return SLUG_TO_SPECIALTY[professionSlug];
  const t = (specialtyText ?? "").toLowerCase();
  if (/derma|estetic|podolog|cosmet/.test(t)) return "dermo";
  if (/kine|fisio/.test(t)) return "kinesiologia";
  if (/nutri/.test(t)) return "nutricion";
  if (/psico/.test(t)) return "psicologia";
  if (/matron|obstet|gine/.test(t)) return "matroneria";
  if (/ocupacional|fono/.test(t)) return "terapia-ocupacional";
  return "medicina";
}

// ---------------------------------------------------------------- campos reutilizados

const eva: AttentionField = { id: "pain.eva", label: "Dolor (EVA)", kind: "scale", min: 0, max: 10, carry: true, help: "0 sin dolor, 10 el peor dolor imaginable." };
const painZone: AttentionField = { id: "pain.zone", label: "Zona del dolor", kind: "text", placeholder: "Ej: rodilla derecha, cara medial", carry: true };
const rom: AttentionField = { id: "kine.rom", label: "Rango de movimiento", kind: "longtext", placeholder: "Ej: flexion rodilla D 110° (normal 135°)", carry: true, width: "full" };
const strength: AttentionField = { id: "kine.strength", label: "Fuerza muscular (0-5)", kind: "scale", min: 0, max: 5, carry: true };

const weight: AttentionField = { id: "body.weight", label: "Peso", kind: "number", unit: "kg", min: 2, max: 400, step: 0.1, carry: true };
const height: AttentionField = { id: "body.height", label: "Talla", kind: "number", unit: "cm", min: 40, max: 230, step: 0.5, carry: true };
const waist: AttentionField = { id: "body.waist", label: "Cintura", kind: "number", unit: "cm", min: 30, max: 250, step: 0.5, carry: true };
const hip: AttentionField = { id: "body.hip", label: "Cadera", kind: "number", unit: "cm", min: 30, max: 250, step: 0.5, carry: true };
const fat: AttentionField = { id: "body.fat", label: "Grasa corporal", kind: "number", unit: "%", min: 2, max: 75, step: 0.1, carry: true };
const muscle: AttentionField = { id: "body.muscle", label: "Masa muscular", kind: "number", unit: "kg", min: 5, max: 120, step: 0.1, carry: true };

const NUTRITION_GOALS = ["Bajar de peso", "Aumentar masa muscular", "Mejorar habitos", "Controlar una patologia", "Rendimiento deportivo", "Embarazo o lactancia"];

// ---------------------------------------------------------------------- catalogo

export const DEFAULT_ATTENTION_TYPES: AttentionTypeDef[] = [
  // Medicina general
  {
    key: "medicina.primera",
    specialty: "medicina",
    name: "Primera vez",
    description: "Anamnesis completa, examen fisico, diagnostico y plan.",
    kind: "first",
    noteFormat: "soap",
    durationMinutes: 30,
    color: "#50c9d5",
    classicStages: true,
    blocks: [],
  },
  {
    key: "medicina.control",
    specialty: "medicina",
    name: "Control",
    description: "Evolucion desde la ultima consulta y ajuste del tratamiento.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 20,
    color: "#6250d6",
    classicStages: true,
    blocks: [],
  },
  {
    key: "medicina.examenes",
    specialty: "medicina",
    name: "Revision de examenes",
    description: "Lectura de resultados y decision clinica.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 15,
    color: "#eda100",
    classicStages: true,
    blocks: [
      {
        id: "exams",
        title: "Examenes revisados",
        fields: [
          { id: "exams.list", label: "Examenes y resultados", kind: "longtext", placeholder: "Hemograma: Hb 13,2 ...", width: "full" },
          { id: "exams.status", label: "Resultado general", kind: "list", options: ["Normal", "Alterado, sin cambios de tratamiento", "Alterado, requiere ajuste", "Requiere derivacion"] },
        ],
      },
    ],
  },

  // Kinesiologia
  {
    key: "kinesiologia.evaluacion",
    specialty: "kinesiologia",
    name: "Evaluacion inicial",
    description: "Dolor, rango de movimiento, fuerza y objetivos del tratamiento.",
    kind: "first",
    noteFormat: "soap",
    durationMinutes: 45,
    color: "#50c9d5",
    blocks: [
      { id: "pain", title: "Dolor", fields: [eva, painZone] },
      { id: "eval", title: "Evaluacion", fields: [rom, strength, { id: "kine.tests", label: "Pruebas especiales", kind: "longtext", width: "full" }] },
      {
        id: "goals",
        title: "Objetivos",
        fields: [
          { id: "kine.goals", label: "Objetivos del tratamiento", kind: "checklist", options: ["Disminuir el dolor", "Recuperar rango de movimiento", "Fortalecer", "Mejorar la marcha", "Volver al deporte", "Volver al trabajo"], width: "full" },
          { id: "kine.sessions", label: "Sesiones estimadas", kind: "number", min: 1, max: 60 },
        ],
      },
    ],
  },
  {
    key: "kinesiologia.sesion",
    specialty: "kinesiologia",
    name: "Sesion / gimnasio",
    description: "Lo que se hizo hoy y como lo tolero.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 40,
    color: "#6250d6",
    blocks: [
      { id: "pain", title: "Dolor", fields: [eva, painZone] },
      {
        id: "session",
        title: "Sesion de hoy",
        fields: [
          { id: "kine.techniques", label: "Tecnicas", kind: "checklist", options: ["Calor / frio", "Electroterapia", "Terapia manual", "Ejercicio terapeutico", "Gimnasio", "Vendaje"], width: "full" },
          { id: "kine.exercises", label: "Ejercicios realizados", kind: "longtext", placeholder: "Sentadilla 3x12, puente gluteo 3x15 ...", width: "full" },
          { id: "kine.tolerance", label: "Tolerancia", kind: "list", options: ["Buena", "Regular", "Mala"] },
        ],
      },
    ],
  },
  {
    key: "kinesiologia.reevaluacion",
    specialty: "kinesiologia",
    name: "Reevaluacion",
    description: "Compara con la evaluacion inicial y ajusta el plan.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 45,
    color: "#eda100",
    blocks: [
      { id: "pain", title: "Dolor", fields: [eva, painZone] },
      { id: "eval", title: "Evaluacion", fields: [rom, strength] },
      { id: "progress", title: "Avance", fields: [{ id: "kine.progress", label: "Logro de objetivos", kind: "scale", min: 0, max: 10, carry: true }, { id: "kine.plan", label: "Ajuste del plan", kind: "longtext", width: "full" }] },
    ],
  },

  // Nutricion
  {
    key: "nutricion.primera",
    specialty: "nutricion",
    name: "Primera consulta",
    description: "Objetivos, mediciones, anamnesis alimentaria y pauta.",
    kind: "first",
    noteFormat: "soap",
    durationMinutes: 60,
    color: "#50c9d5",
    blocks: [
      {
        id: "goals",
        title: "Objetivos",
        fields: [
          { id: "nutri.goals", label: "Que busca el paciente", kind: "checklist", options: NUTRITION_GOALS, width: "full" },
          { id: "nutri.goalsText", label: "En sus palabras", kind: "longtext", width: "full" },
        ],
      },
      { id: "body", title: "Mediciones", fields: [weight, height, waist, hip, fat, muscle] },
      {
        id: "intake",
        title: "Anamnesis alimentaria",
        fields: [
          { id: "nutri.recall", label: "Recordatorio de 24 horas", kind: "longtext", width: "full" },
          { id: "nutri.frequency", label: "Frecuencia de consumo", kind: "longtext", width: "full" },
          { id: "nutri.activity", label: "Actividad fisica", kind: "list", options: ["Sedentaria", "Ligera", "Moderada", "Intensa"], carry: true },
          { id: "nutri.water", label: "Agua al dia", kind: "number", unit: "vasos", min: 0, max: 30, carry: true },
        ],
      },
    ],
  },
  {
    key: "nutricion.control",
    specialty: "nutricion",
    name: "Control",
    description: "Mediciones contra la consulta anterior y adherencia a la pauta.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 30,
    color: "#6250d6",
    blocks: [
      { id: "body", title: "Mediciones", fields: [weight, waist, hip, fat, muscle] },
      { id: "adherence", title: "Adherencia", fields: [{ id: "nutri.adherence", label: "Cumplimiento de la pauta", kind: "scale", min: 0, max: 10, carry: true }, { id: "nutri.barriers", label: "Dificultades", kind: "longtext", width: "full" }] },
    ],
  },

  // Psicologia
  {
    key: "psicologia.entrevista",
    specialty: "psicologia",
    name: "Primera entrevista",
    description: "Motivo de consulta, historia y evaluacion de riesgo.",
    kind: "first",
    noteFormat: "free",
    durationMinutes: 60,
    color: "#50c9d5",
    blocks: [
      {
        id: "context",
        title: "Motivo y contexto",
        fields: [
          { id: "psi.history", label: "Historia del problema", kind: "longtext", width: "full" },
          { id: "psi.support", label: "Red de apoyo", kind: "longtext", width: "full" },
        ],
      },
      { id: "risk", title: "Riesgo", fields: [{ id: "psi.risk", label: "Evaluacion de riesgo", kind: "list", options: ["Sin riesgo", "Bajo", "Moderado", "Alto"], carry: true }] },
    ],
  },
  {
    key: "psicologia.seguimiento",
    specialty: "psicologia",
    name: "Seguimiento",
    description: "Sesion en formato DAP con el animo de la semana.",
    kind: "followup",
    noteFormat: "dap",
    durationMinutes: 50,
    color: "#6250d6",
    blocks: [{ id: "mood", title: "Estado", fields: [{ id: "psi.mood", label: "Animo percibido", kind: "scale", min: 0, max: 10, carry: true }, { id: "psi.risk", label: "Evaluacion de riesgo", kind: "list", options: ["Sin riesgo", "Bajo", "Moderado", "Alto"], carry: true }] }],
  },
  {
    key: "psicologia.cierre",
    specialty: "psicologia",
    name: "Cierre / alta",
    description: "Logros del proceso y recomendaciones.",
    kind: "closure",
    noteFormat: "free",
    durationMinutes: 50,
    color: "#16a34a",
    blocks: [
      {
        id: "closing",
        title: "Cierre del proceso",
        fields: [
          { id: "psi.closeReason", label: "Motivo del cierre", kind: "list", options: ["Alta terapeutica", "Derivacion", "Acuerdo mutuo", "Abandono"] },
          { id: "psi.achievements", label: "Logros", kind: "longtext", width: "full" },
          { id: "psi.recommendations", label: "Recomendaciones", kind: "longtext", width: "full" },
        ],
      },
    ],
  },

  // Matroneria
  {
    key: "matroneria.ingreso",
    specialty: "matroneria",
    name: "Ingreso prenatal",
    description: "Edad gestacional, antecedentes y examenes de ingreso.",
    kind: "first",
    noteFormat: "soap",
    durationMinutes: 45,
    color: "#50c9d5",
    blocks: [
      {
        id: "pregnancy",
        title: "Gestacion",
        fields: [
          { id: "mat.lmp", label: "Fecha de ultima regla", kind: "date", carry: true },
          { id: "mat.usWeeks", label: "Semanas por ecografia", kind: "number", unit: "sem", min: 0, max: 44, step: 0.1 },
          { id: "mat.gpa", label: "Gestas / partos / abortos", kind: "text", placeholder: "G2 P1 A0", carry: true },
        ],
      },
      { id: "body", title: "Mediciones", fields: [weight, height, { id: "mat.bp", label: "Presion arterial", kind: "text", placeholder: "110/70", carry: true }] },
      { id: "history", title: "Antecedentes", fields: [{ id: "mat.obHistory", label: "Antecedentes obstetricos", kind: "longtext", width: "full" }] },
    ],
  },
  {
    key: "matroneria.control",
    specialty: "matroneria",
    name: "Control prenatal",
    description: "Peso, altura uterina, latidos y movimientos fetales.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 30,
    color: "#6250d6",
    blocks: [
      { id: "body", title: "Mediciones", fields: [weight, { id: "mat.bp", label: "Presion arterial", kind: "text", placeholder: "110/70", carry: true }, { id: "mat.fundal", label: "Altura uterina", kind: "number", unit: "cm", min: 5, max: 45, carry: true }, { id: "mat.fhr", label: "Latidos fetales", kind: "number", unit: "lpm", min: 60, max: 220, carry: true }] },
      { id: "fetal", title: "Bienestar", fields: [{ id: "mat.movements", label: "Movimientos fetales", kind: "list", options: ["Presentes", "Disminuidos", "Ausentes"] }, { id: "mat.edema", label: "Edema", kind: "list", options: ["Sin edema", "Leve", "Moderado", "Severo"] }] },
    ],
  },
  {
    key: "matroneria.posparto",
    specialty: "matroneria",
    name: "Posparto",
    description: "Lactancia, involucion y estado emocional.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 30,
    color: "#16a34a",
    blocks: [
      {
        id: "postpartum",
        title: "Puerperio",
        fields: [
          { id: "mat.breastfeeding", label: "Lactancia", kind: "list", options: ["Exclusiva", "Mixta", "Formula"] },
          { id: "mat.uterus", label: "Involucion uterina", kind: "list", options: ["Adecuada", "Subinvolucion"] },
          { id: "mat.epds", label: "Escala de Edimburgo (EPDS)", kind: "number", min: 0, max: 30, help: "10 o mas sugiere evaluar depresion posparto." },
          { id: "mat.wound", label: "Herida o episiotomia", kind: "text" },
        ],
      },
    ],
  },

  // Terapia ocupacional
  {
    key: "terapia-ocupacional.evaluacion",
    specialty: "terapia-ocupacional",
    name: "Evaluacion inicial",
    description: "Desempeno ocupacional y metas funcionales.",
    kind: "first",
    noteFormat: "birp",
    durationMinutes: 60,
    color: "#50c9d5",
    blocks: [
      {
        id: "performance",
        title: "Desempeno ocupacional",
        fields: [
          { id: "to.routine", label: "Rutina diaria", kind: "longtext", width: "full" },
          { id: "to.areas", label: "Areas afectadas", kind: "checklist", options: ["AVD basicas", "AVD instrumentales", "Trabajo o estudio", "Ocio", "Participacion social", "Descanso y sueno"], width: "full" },
        ],
      },
      { id: "goals", title: "Metas funcionales", fields: [{ id: "to.goals", label: "Metas (una por linea)", kind: "longtext", width: "full", carry: true }] },
    ],
  },
  {
    key: "terapia-ocupacional.intervencion",
    specialty: "terapia-ocupacional",
    name: "Intervencion",
    description: "Sesion en formato BIRP y tareas para la casa.",
    kind: "followup",
    noteFormat: "birp",
    durationMinutes: 45,
    color: "#6250d6",
    blocks: [{ id: "session", title: "Sesion", fields: [{ id: "to.goals", label: "Metas trabajadas", kind: "longtext", width: "full", carry: true }, { id: "to.homework", label: "Tareas para la casa", kind: "longtext", width: "full" }] }],
  },
  {
    key: "terapia-ocupacional.reevaluacion",
    specialty: "terapia-ocupacional",
    name: "Reevaluacion de metas",
    description: "Logro de cada meta y ajuste del plan.",
    kind: "followup",
    noteFormat: "birp",
    durationMinutes: 45,
    color: "#eda100",
    blocks: [{ id: "progress", title: "Avance", fields: [{ id: "to.progress", label: "Logro de metas", kind: "scale", min: 0, max: 10, carry: true }, { id: "to.goals", label: "Metas ajustadas", kind: "longtext", width: "full", carry: true }] }],
  },

  // Dermatologia, podologia y estetica
  {
    key: "dermo.evaluacion",
    specialty: "dermo",
    name: "Evaluacion",
    description: "Zona, fototipo, hallazgos y fotos de inicio.",
    kind: "first",
    noteFormat: "soap",
    durationMinutes: 30,
    color: "#50c9d5",
    blocks: [
      {
        id: "skin",
        title: "Evaluacion",
        fields: [
          { id: "dermo.zone", label: "Zona", kind: "text", carry: true },
          { id: "dermo.phototype", label: "Fototipo", kind: "list", options: ["I", "II", "III", "IV", "V", "VI"], carry: true },
          { id: "dermo.findings", label: "Lesiones y hallazgos", kind: "longtext", width: "full" },
          { id: "dermo.photos", label: "Fotos tomadas con consentimiento", kind: "checkbox" },
        ],
      },
    ],
  },
  {
    key: "dermo.procedimiento",
    specialty: "dermo",
    name: "Procedimiento",
    description: "Producto, lote, dosis y reacciones.",
    kind: "procedure",
    noteFormat: "soap",
    durationMinutes: 45,
    color: "#6250d6",
    blocks: [
      {
        id: "procedure",
        title: "Procedimiento",
        fields: [
          { id: "dermo.procedure", label: "Procedimiento", kind: "text" },
          { id: "dermo.zone", label: "Zona tratada", kind: "text", carry: true },
          { id: "dermo.product", label: "Producto y lote", kind: "text", carry: true },
          { id: "dermo.dose", label: "Dosis o unidades", kind: "text", carry: true },
          { id: "dermo.reaction", label: "Reacciones inmediatas", kind: "longtext", width: "full" },
        ],
      },
    ],
  },
  {
    key: "dermo.control",
    specialty: "dermo",
    name: "Control con fotos",
    description: "Evolucion comparada con las fotos anteriores.",
    kind: "followup",
    noteFormat: "soap",
    durationMinutes: 20,
    color: "#eda100",
    blocks: [
      {
        id: "followup",
        title: "Evolucion",
        fields: [
          { id: "dermo.zone", label: "Zona", kind: "text", carry: true },
          { id: "dermo.satisfaction", label: "Satisfaccion del paciente", kind: "scale", min: 0, max: 10, carry: true },
          { id: "dermo.evolution", label: "Comparacion con fotos previas", kind: "longtext", width: "full" },
          { id: "dermo.photos", label: "Fotos tomadas con consentimiento", kind: "checkbox" },
        ],
      },
    ],
  },
];

// ------------------------------------------------------------------- formatos de nota

export const NOTE_FORMATS: Record<NoteFormat, { label: string; fields: Array<{ id: string; label: string; placeholder: string }> }> = {
  soap: {
    label: "SOAP",
    fields: [
      { id: "note.s", label: "S · Subjetivo", placeholder: "Lo que relata el paciente." },
      { id: "note.o", label: "O · Objetivo", placeholder: "Lo observado y medido." },
      { id: "note.a", label: "A · Analisis", placeholder: "Interpretacion clinica." },
      { id: "note.p", label: "P · Plan", placeholder: "Que se hara y que se indica." },
    ],
  },
  dap: {
    label: "DAP",
    fields: [
      { id: "note.d", label: "D · Datos", placeholder: "Lo que trae el paciente y lo observado en sesion." },
      { id: "note.a", label: "A · Analisis", placeholder: "Lectura clinica de la sesion." },
      { id: "note.p", label: "P · Plan", placeholder: "Proximos pasos y tareas." },
    ],
  },
  birp: {
    label: "BIRP",
    fields: [
      { id: "note.b", label: "B · Conducta", placeholder: "Como llega y se presenta." },
      { id: "note.i", label: "I · Intervencion", placeholder: "Lo que se hizo en la sesion." },
      { id: "note.r", label: "R · Respuesta", placeholder: "Como respondio a la intervencion." },
      { id: "note.p", label: "P · Plan", placeholder: "Proximos pasos." },
    ],
  },
  free: {
    label: "Texto libre",
    fields: [{ id: "note.free", label: "Nota de la sesion", placeholder: "Escribe la evolucion con tus palabras." }],
  },
};

export const NOTE_FORMAT_KEYS = Object.keys(NOTE_FORMATS) as NoteFormat[];

/** Todos los ids de campo de un tipo, incluida la nota. Sirve para validar lo que llega del navegador. */
export function fieldIdsOf(type: Pick<AttentionTypeDef, "blocks" | "noteFormat">) {
  return new Set([...type.blocks.flatMap((b) => b.fields.map((f) => f.id)), ...NOTE_FORMATS[type.noteFormat].fields.map((f) => f.id)]);
}

export const findDefaultType = (key: string) => DEFAULT_ATTENTION_TYPES.find((t) => t.key === key) ?? null;

/**
 * La tarjeta mas probable: la que preselecciono recepcion; si no, la primera vez cuando el paciente
 * no tiene atenciones previas con esta especialidad; si no, el mismo tipo de seguimiento de la ultima vez
 * o el primer seguimiento de la lista.
 */
export function suggestType(types: AttentionTypeDef[], opts: { preselected?: string | null; previousVisits: number; lastTypeKey?: string | null }) {
  const visible = types;
  if (opts.preselected && visible.some((t) => t.key === opts.preselected)) return opts.preselected;
  if (opts.previousVisits === 0) return visible.find((t) => t.kind === "first")?.key ?? visible[0]?.key ?? null;
  const last = visible.find((t) => t.key === opts.lastTypeKey);
  if (last && last.kind !== "first" && last.kind !== "closure") return last.key;
  return visible.find((t) => t.kind === "followup")?.key ?? visible[0]?.key ?? null;
}
