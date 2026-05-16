export const EMAIL_TEMPLATE_TYPES = [
  "APPOINTMENT_CANCELLATION",
  "PATIENT_WELCOME",
  "USER_WELCOME",
  "PAYMENT_UPDATE",
  "PROFESSIONAL_PAYOUT",
  "INTERNAL_ALERT",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export type EmailTemplate = {
  id: string;
  eventType: EmailTemplateType;
  subject: string;
  body: string;
  enabled: boolean;
};

export type EmailTemplateInput = {
  eventType: EmailTemplateType;
  subject: string;
  body: string;
  enabled: boolean;
};

export type EmailTemplateVariable = {
  key: string;
  label: string;
  example: string;
};

export const EMAIL_TEMPLATE_META: Record<
  EmailTemplateType,
  { label: string; description: string; variables: EmailTemplateVariable[] }
> = {
  APPOINTMENT_CANCELLATION: {
    label: "Cancelacion de cita",
    description: "Se envia al paciente cuando su cita es cancelada por la clinica.",
    variables: [
      { key: "patientName", label: "Nombre paciente", example: "Juan Perez" },
      { key: "doctorName", label: "Nombre profesional", example: "Dr. Maria Lopez" },
      { key: "dateTime", label: "Fecha y hora", example: "15 de enero 2026, 10:30" },
      { key: "clinicName", label: "Nombre clinica", example: "Clinica Dental Central" },
      { key: "reason", label: "Motivo", example: "Reagendamiento por fuerza mayor" },
    ],
  },
  PATIENT_WELCOME: {
    label: "Bienvenida paciente",
    description: "Se envia al paciente cuando es registrado en el sistema.",
    variables: [
      { key: "firstName", label: "Nombre", example: "Juan" },
      { key: "clinicName", label: "Nombre clinica", example: "Clinica Dental Central" },
    ],
  },
  USER_WELCOME: {
    label: "Bienvenida usuario",
    description: "Se envia al profesional o secretaria cuando se crea su cuenta.",
    variables: [
      { key: "name", label: "Nombre completo", example: "Maria Lopez" },
      { key: "email", label: "Email / usuario", example: "maria@clinica.cl" },
      { key: "password", label: "Contrasena temporal", example: "abc123" },
      { key: "clinics", label: "Sedes asignadas", example: "Santiago, Vina del Mar" },
    ],
  },
  PAYMENT_UPDATE: {
    label: "Actualizacion de pago",
    description: "Se envia al paciente cuando se actualiza el estado de un tratamiento/pago.",
    variables: [
      { key: "patientName", label: "Nombre paciente", example: "Juan Perez" },
      { key: "treatmentName", label: "Tratamiento", example: "Ortodoncia" },
      { key: "amount", label: "Monto", example: "$150.000" },
      { key: "status", label: "Estado", example: "Pagado" },
      { key: "clinicName", label: "Nombre clinica", example: "Clinica Dental Central" },
    ],
  },
  PROFESSIONAL_PAYOUT: {
    label: "Liquidacion mensual",
    description: "Se envia al profesional con el resumen de su liquidacion del mes.",
    variables: [
      { key: "professionalName", label: "Nombre profesional", example: "Dr. Maria Lopez" },
      { key: "month", label: "Mes", example: "enero de 2026" },
      { key: "clinicName", label: "Nombre clinica", example: "Clinica Dental Central" },
      { key: "grossAmount", label: "Total recaudado", example: "$1.500.000" },
      { key: "clinicRetention", label: "Retencion clinica", example: "$450.000" },
      { key: "siiRetention", label: "Retencion SII", example: "$157.500" },
      { key: "netAmount", label: "Total a pagar", example: "$892.500" },
    ],
  },
  INTERNAL_ALERT: {
    label: "Alerta interna",
    description: "Se envia al personal interno cuando ocurre un evento relevante.",
    variables: [
      { key: "recipientName", label: "Nombre destinatario", example: "Ana Garcia" },
      { key: "eventType", label: "Tipo de evento", example: "Cita creada" },
      { key: "message", label: "Detalle", example: "Nueva cita agendada para manana" },
      { key: "actorLabel", label: "Generada por", example: "Administrador" },
      { key: "clinicName", label: "Nombre clinica", example: "Clinica Dental Central" },
    ],
  },
};

/** Default templates used when a clinic hasn't customized a template yet. */
export const DEFAULT_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  APPOINTMENT_CANCELLATION: {
    subject: "Tu cita fue cancelada en {{clinicName}}",
    body: `Hola {{patientName}},

Tu cita fue cancelada.

Fecha y hora cancelada: {{dateTime}}
Profesional: {{doctorName}}
Sede: {{clinicName}}
Motivo: {{reason}}

Si necesitas reagendar, contacta a la clinica.`,
  },
  PATIENT_WELCOME: {
    subject: "Bienvenido a {{clinicName}}",
    body: `Hola {{firstName}},

Tu registro como paciente fue creado correctamente en {{clinicName}}.

Si necesitas ayuda, contacta a la clinica.

Saludos,
Equipo {{clinicName}}`,
  },
  USER_WELCOME: {
    subject: "Bienvenido a {{clinicName}} - tu cuenta fue creada",
    body: `Hola {{name}},

Te damos la bienvenida.
Tu cuenta fue creada por el administrador.

Sedes asignadas: {{clinics}}
Usuario: {{email}}
Contrasena temporal: {{password}}

Por seguridad, cambia tu contrasena al iniciar sesion.`,
  },
  PAYMENT_UPDATE: {
    subject: "Estado de tu tratamiento/pago en {{clinicName}}",
    body: `Hola {{patientName}},

Se actualizo el estado de tu tratamiento.

Tratamiento: {{treatmentName}}
Monto: {{amount}}
Estado: {{status}}
Sede: {{clinicName}}

Si tienes dudas, contacta a la clinica.`,
  },
  PROFESSIONAL_PAYOUT: {
    subject: "Liquidacion {{month}} - {{clinicName}}",
    body: `Hola {{professionalName}},

Te compartimos tu resumen de liquidacion del mes de {{month}}.

Total recaudado: {{grossAmount}}
Retencion clinica: {{clinicRetention}}
Retencion SII: {{siiRetention}}
Total estimado a pagar: {{netAmount}}

Sede: {{clinicName}}`,
  },
  INTERNAL_ALERT: {
    subject: "[Alerta interna] {{eventType}}",
    body: `Hola {{recipientName}},

Se genero una alerta interna.

Sede: {{clinicName}}
Tipo: {{eventType}}
Detalle: {{message}}
Generada por: {{actorLabel}}

Este mensaje es solo para usuarios internos del sistema.`,
  },
};
