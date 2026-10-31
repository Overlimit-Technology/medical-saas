/**
 * Codigos Fonasa (Modalidad Libre Eleccion) que la clinica puede asociar a sus servicios.
 * Lista inicial de kinesiologia, terapia ocupacional y telerehabilitacion, tomada del Flujo SaaS.
 * Fuente: aranceles MLE de Fonasa. Para agregar otras especialidades, sumarlas aqui.
 */
export type FonasaCode = { code: string; name: string; group: string };

export const FONASA_CODES: FonasaCode[] = [
  { code: "0601001", name: "Evaluación kinesiológica (muscular, articular, postural, neurológica y funcional)", group: "Kinesiología" },
  { code: "0601003", name: "Examen de función muscular", group: "Kinesiología" },
  { code: "0601005", name: "Lámpara infrarroja / compresas húmedo-caliente", group: "Kinesiología" },
  { code: "0601011", name: "Ultrasonido terapéutico", group: "Kinesiología" },
  { code: "0601012", name: "Analgesia transcutánea (TENS)", group: "Kinesiología" },
  { code: "0601013", name: "Estimulación eléctrica", group: "Kinesiología" },
  { code: "0601014", name: "Iontoforesis", group: "Kinesiología" },
  { code: "0601017", name: "Ejercicios respiratorios", group: "Kinesiología" },
  { code: "0601021", name: "Manipulación osteopática (liberación articular, manipulación vertebral)", group: "Kinesiología" },
  { code: "0601022", name: "Masoterapia (por sesión)", group: "Kinesiología" },
  { code: "0601024", name: "Reeducación motriz (ejercicios terapéuticos individuales, mínimo 30 minutos)", group: "Kinesiología" },
  { code: "0601025", name: "Técnicas de facilitación o inhibición (Kabat y/o Bobath)", group: "Kinesiología" },
  { code: "0601026", name: "Técnicas de relajación", group: "Kinesiología" },
  { code: "0601027", name: "Tracción cervical y/o lumbar", group: "Kinesiología" },
  { code: "0601028", name: "Entrenamiento cardiorrespiratorio funcional", group: "Kinesiología" },
  { code: "0601030", name: "Drenajes posturales bronquiales", group: "Kinesiología" },
  { code: "0601101", name: "Evaluación kinesiológica integral", group: "Atención kinesiológica integral" },
  { code: "0601105", name: "Atención kinesiológica integral ambulatoria", group: "Atención kinesiológica integral" },
  { code: "0601106", name: "Atención kinesiológica integral domiciliaria", group: "Atención kinesiológica integral" },
  { code: "0601103", name: "Atención kinesiológica integral pacientes hospitalizados", group: "Atención kinesiológica integral" },
  { code: "0601104", name: "Atención kinesiológica integral UPC", group: "Atención kinesiológica integral" },
  { code: "0602001", name: "Atención integral de terapia ocupacional", group: "Terapia ocupacional" },
  { code: "0602002", name: "Intervención de terapia ocupacional en ayudas técnicas y tecnología asistida", group: "Terapia ocupacional" },
  { code: "0602003", name: "Intervención de terapia ocupacional en actividades de la vida diaria", group: "Terapia ocupacional" },
  { code: "0608101", name: "Telerehabilitación: evaluación kinesiológica integral", group: "Telerehabilitación" },
  { code: "0608102", name: "Telerehabilitación: atención kinesiológica integral", group: "Telerehabilitación" },
];

export const FONASA_CODE_PATTERN = /^\d{7}$/;

export function fonasaLabel(code: string | null | undefined) {
  if (!code) return null;
  return FONASA_CODES.find((c) => c.code === code)?.name ?? null;
}
