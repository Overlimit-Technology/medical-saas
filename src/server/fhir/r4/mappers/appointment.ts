import { APPOINTMENT_PAYMENT_STATUS_EXTENSION_URL } from "@/server/fhir/r4/constants";

// Estados internos actuales que vienen desde Prisma/servicios.
export type InternalAppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type InternalPaymentStatus = "PENDING" | "PAID" | "WAIVED";

// Estados FHIR R4 que usamos en el mapper.
export type FhirAppointmentStatus =
  | "proposed"
  | "pending"
  | "booked"
  | "arrived"
  | "fulfilled"
  | "cancelled"
  | "noshow"
  | "entered-in-error"
  | "checked-in"
  | "waitlist";

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirAppointmentParticipant = {
  actor?: FhirReference;
  status?: string;
};

type FhirExtension = {
  url: string;
  valueCode?: string;
};

export type FhirAppointment = {
  resourceType: "Appointment";
  id?: string;
  status: FhirAppointmentStatus;
  start?: string;
  end?: string;
  created?: string;
  description?: string;
  participant: FhirAppointmentParticipant[];
  extension?: FhirExtension[];
};

// Forma interna minima para convertir una cita a FHIR.
export type InternalAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: Date | string;
  endAt: Date | string;
  status?: string | null;
  paymentStatus?: string | null;
  notes?: string | null;
  createdAt?: Date | string | null;
  patient?: {
    firstName: string;
    lastName: string;
    secondLastName?: string | null;
    run?: string | null;
  } | null;
  doctor?: {
    email?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
  box?: {
    name?: string | null;
  } | null;
};

// Forma interna de entrada al parsear Appointment FHIR.
export type InternalAppointmentDraft = {
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: Date;
  endAt: Date;
  status?: InternalAppointmentStatus;
  paymentStatus?: InternalPaymentStatus;
  notes?: string | null;
};

// Normaliza strings (trim + null cuando viene vacio).
function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

// Convierte Date/string interna a ISO-8601 para FHIR dateTime.
function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return undefined;
  return date.toISOString();
}

// Valida que start/end existan y sean fechas parseables.
function parseDateTime(value: string | undefined, field: string) {
  if (!value) {
    throw new Error(`Appointment.${field} is required.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Appointment.${field} is invalid.`);
  }
  return parsed;
}

// Une partes opcionales en un display legible.
function fullName(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => clean(part))
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();
}

// Tabla de mapeo de estado interno -> estado Appointment FHIR.
export function mapInternalAppointmentStatusToFhir(
  status: string | null | undefined
): FhirAppointmentStatus {
  switch (status) {
    case "SCHEDULED":
    case "CONFIRMED":
      return "booked";
    case "CANCELLED":
      return "cancelled";
    case "COMPLETED":
      return "fulfilled";
    case "NO_SHOW":
      return "noshow";
    default:
      return "proposed";
  }
}

// Tabla de mapeo de estado Appointment FHIR -> estado interno.
export function mapFhirAppointmentStatusToInternal(
  status: FhirAppointmentStatus | undefined
): InternalAppointmentStatus {
  switch (status) {
    case "cancelled":
    case "entered-in-error":
      return "CANCELLED";
    case "fulfilled":
      return "COMPLETED";
    case "noshow":
      return "NO_SHOW";
    default:
      return "SCHEDULED";
  }
}

// Extrae el id desde referencias tipo "ResourceType/{id}".
function parseReferenceId(reference: string | undefined, resourceType: string) {
  const normalized = clean(reference);
  if (!normalized) return null;
  const regex = new RegExp(`(?:^|/)${resourceType}/([^/]+)$`);
  const match = normalized.match(regex);
  return match?.[1] ?? null;
}

// Acepta solo estados de pago conocidos por el modelo interno.
function normalizePaymentStatus(code: string | undefined): InternalPaymentStatus | undefined {
  const normalized = clean(code)?.toUpperCase();
  if (normalized === "PENDING" || normalized === "PAID" || normalized === "WAIVED") {
    return normalized;
  }
  return undefined;
}

// Convierte una cita interna a Appointment FHIR con participants y extension de pago.
export function mapInternalAppointmentToFhir(input: InternalAppointment): FhirAppointment {
  const patientDisplay = input.patient
    ? fullName([input.patient.firstName, input.patient.lastName, input.patient.secondLastName])
    : null;
  const doctorDisplay = input.doctor
    ? fullName([
        input.doctor.profile?.firstName,
        input.doctor.profile?.lastName,
        input.doctor.email ?? undefined,
      ])
    : null;

  const participant: FhirAppointmentParticipant[] = [
    {
      actor: {
        reference: `Patient/${input.patientId}`,
        display: patientDisplay ?? undefined,
      },
      status: "accepted",
    },
    {
      actor: {
        reference: `Practitioner/${input.doctorId}`,
        display: doctorDisplay ?? undefined,
      },
      status: "accepted",
    },
    {
      actor: {
        reference: `Location/${input.boxId}`,
        display: clean(input.box?.name) ?? undefined,
      },
      status: "accepted",
    },
  ];

  const resource: FhirAppointment = {
    resourceType: "Appointment",
    id: input.id,
    status: mapInternalAppointmentStatusToFhir(input.status),
    start: toIso(input.startAt),
    end: toIso(input.endAt),
    created: toIso(input.createdAt),
    description: clean(input.notes) ?? undefined,
    participant,
  };

  const paymentStatus = normalizePaymentStatus(input.paymentStatus ?? undefined);
  if (paymentStatus) {
    resource.extension = [
      {
        url: APPOINTMENT_PAYMENT_STATUS_EXTENSION_URL,
        valueCode: paymentStatus,
      },
    ];
  }

  return resource;
}

// Convierte Appointment FHIR a borrador interno, validando referencias y rango horario.
export function mapFhirAppointmentToInternalDraft(
  resource: FhirAppointment
): InternalAppointmentDraft {
  const patientParticipant = resource.participant.find((item) =>
    parseReferenceId(item.actor?.reference, "Patient")
  );
  const doctorParticipant = resource.participant.find((item) =>
    parseReferenceId(item.actor?.reference, "Practitioner")
  );
  const locationParticipant = resource.participant.find((item) =>
    parseReferenceId(item.actor?.reference, "Location")
  );

  const patientId = parseReferenceId(patientParticipant?.actor?.reference, "Patient");
  const doctorId = parseReferenceId(doctorParticipant?.actor?.reference, "Practitioner");
  const boxId = parseReferenceId(locationParticipant?.actor?.reference, "Location");
  if (!patientId || !doctorId || !boxId) {
    throw new Error("Appointment participant references for Patient, Practitioner and Location are required.");
  }

  const startAt = parseDateTime(resource.start, "start");
  const endAt = parseDateTime(resource.end, "end");
  if (endAt <= startAt) {
    throw new Error("Appointment.end must be later than Appointment.start.");
  }

  const paymentStatus = normalizePaymentStatus(
    resource.extension?.find((ext) => ext.url === APPOINTMENT_PAYMENT_STATUS_EXTENSION_URL)?.valueCode
  );

  return {
    patientId,
    doctorId,
    boxId,
    startAt,
    endAt,
    status: mapFhirAppointmentStatusToInternal(resource.status),
    paymentStatus,
    notes: clean(resource.description),
  };
}
