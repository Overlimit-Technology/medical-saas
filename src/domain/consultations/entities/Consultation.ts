/**
 * Consulta clinica ("Iniciar cita").
 *
 * Una consulta es la sesion de trabajo que el profesional abre sobre una cita
 * agendada. No introduce tablas nuevas: se apoya en tres entidades existentes.
 *
 *   ClinicalVisit  -> el encuentro en si (cuando se abrio, quien atiende).
 *   Observation    -> cada dato clinico capturado, narrativo o medido. Mientras
 *                     la consulta sigue abierta viven como PRELIMINARY, asi el
 *                     borrador sobrevive a un refresh o a un cambio de equipo;
 *                     al cerrar la consulta pasan a FINAL de una sola vez.
 *   ClinicalRecord -> las fichas por plantilla, que conservan su flujo propio.
 */

/** Secciones narrativas de la consulta. Se guardan como Observation STRING. */
export type ConsultationSectionKey =
  | "chiefComplaint"
  | "anamnesis"
  | "allergies"
  | "currentMedication"
  | "physicalExam"
  | "diagnosis"
  | "diagnosisCode"
  | "differential"
  | "procedures"
  | "prescription"
  | "indications"
  | "privateNote";

/** Mediciones de la consulta. Se guardan como Observation QUANTITY con LOINC. */
export type ConsultationVitalKey =
  | "systolicBp"
  | "diastolicBp"
  | "heartRate"
  | "respiratoryRate"
  | "temperature"
  | "oxygenSaturation"
  | "weight"
  | "height"
  | "painScale"
  | "glucose";

/** Borrador editable. Todo se transporta como texto y se castea al persistir. */
export type ConsultationDraft = {
  sections: Partial<Record<ConsultationSectionKey, string>>;
  vitals: Partial<Record<ConsultationVitalKey, string>>;
};

export type ConsultationVisit = {
  id: string;
  startedAt: string;
  /** Una consulta se considera cerrada cuando ya no quedan datos PRELIMINARY. */
  isClosed: boolean;
};

export type ConsultationPatient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  fullName: string;
  run: string;
  birthDate: string | null;
  age: number | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export type ConsultationAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentStatus: "PENDING" | "PAID" | "WAIVED";
  notes: string | null;
  arrivedAt: string | null;
  delayMinutes: number | null;
  doctorId: string;
  doctorName: string;
  boxId: string;
  boxName: string;
  treatmentPlan: {
    id: string;
    name: string;
    sessionIndex: number | null;
    totalSessions: number;
  } | null;
  paymentEntry: {
    id: string;
    status: "PENDING" | "PAID" | "WAIVED";
    amount: number;
    notes: string | null;
    treatment: { id: string; name: string; price: number };
  } | null;
};

/** Una medicion previa, para mostrar la variacion respecto de hoy. */
export type ConsultationVitalReading = {
  value: number;
  unit: string | null;
  effectiveAt: string;
};

/** Consulta anterior del paciente, resumida para la linea de tiempo. */
export type ConsultationTimelineEntry = {
  id: string;
  startedAt: string;
  appointmentId: string | null;
  doctorName: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  indications: string | null;
};

export type ConsultationPlanSummary = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  totalSessions: number;
  completedSessions: number;
  nextSessionAt: string | null;
};

export type ConsultationTreatmentEntry = {
  id: string;
  name: string;
  performedAt: string;
  amount: number | null;
  paymentStatus: "PENDING" | "PAID" | "WAIVED" | null;
};

export type ConsultationRecordSummary = {
  id: string;
  templateName: string;
  createdAt: string;
  doctorName: string;
  belongsToThisAppointment: boolean;
};

export type ConsultationHistory = {
  /** Consultas previas, de la mas reciente a la mas antigua. */
  timeline: ConsultationTimelineEntry[];
  /** Ultimo valor conocido de cada signo vital, de cualquier consulta anterior. */
  lastVitals: Partial<Record<ConsultationVitalKey, ConsultationVitalReading>>;
  /** Alergias y farmacos arrastrados desde la ultima consulta que los registro. */
  carriedAllergies: string | null;
  carriedMedication: string | null;
  plans: ConsultationPlanSummary[];
  treatments: ConsultationTreatmentEntry[];
  records: ConsultationRecordSummary[];
  totalVisits: number;
  lastVisitAt: string | null;
  upcomingAppointments: Array<{
    id: string;
    startAt: string;
    doctorName: string;
    boxName: string;
  }>;
};

export type ConsultationCatalog = {
  treatments: Array<{ id: string; name: string; price: number }>;
  boxes: Array<{ id: string; name: string }>;
};

export type ConsultationBootstrap = {
  appointment: ConsultationAppointment;
  patient: ConsultationPatient;
  visit: ConsultationVisit | null;
  draft: ConsultationDraft;
  history: ConsultationHistory;
  catalog: ConsultationCatalog;
};

/** Control unico: "vuelve en X". */
export type ConsultationFollowUpSingle = {
  mode: "single";
  startAt: string;
  durationMinutes: number;
  boxId: string;
  notes: string | null;
};

/** Serie de sesiones: "plan de N citas cada X dias". */
export type ConsultationFollowUpPlan = {
  mode: "plan";
  name: string;
  startAt: string;
  durationMinutes: number;
  boxId: string;
  totalSessions: number;
  frequencyDays: number;
  treatmentIds: string[];
  notes: string | null;
};

export type ConsultationFollowUp = ConsultationFollowUpSingle | ConsultationFollowUpPlan;

export type ConsultationCharge = {
  treatmentId: string;
  amount: number;
  status: "PENDING" | "PAID" | "WAIVED";
  notes: string | null;
};

export type ConsultationClosureInput = {
  draft: ConsultationDraft;
  followUp: ConsultationFollowUp | null;
  charge: ConsultationCharge | null;
  /** Como termino la cita. NO_SHOW cierra sin exigir contenido clinico. */
  outcome: "COMPLETED" | "NO_SHOW";
};

export type ConsultationClosureResult = {
  appointmentStatus: ConsultationAppointment["status"];
  closedAt: string;
  followUpAppointmentId: string | null;
  createdPlanId: string | null;
  chargeRegistered: boolean;
  warnings: string[];
};
