export type FieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA" | "BOOLEAN" | "SIGNATURE" | "VARIABLE";

export type TemplateType = "REPORT" | "CONSENT" | "ATTENDANCE_CERTIFICATE";

export type TemplateField = {
  id?: string;
  label: string;
  fieldType: FieldType;
  position: number;
  isRequired: boolean;
  options: string | null;
  defaultValue: string | null;
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  includeLogo: boolean;
  templateType: TemplateType;
  ownerDoctorId: string | null;
  fields: TemplateField[];
  _count: { clinicalRecords: number };
};

export const TEMPLATE_VARIABLES: Record<string, string> = {
  patient_full_name: "Nombre del paciente",
  patient_rut: "RUT del paciente",
  doctor_full_name: "Nombre del profesional",
  doctor_specialty: "Especialidad",
  appointment_date: "Fecha de la cita",
  appointment_time: "Hora de la cita",
  clinic_name: "Nombre de la clínica",
  treatment: "Tratamiento",
};

export type VariableKey = keyof typeof TEMPLATE_VARIABLES;
