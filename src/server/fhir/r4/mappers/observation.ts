export type FhirObservationStatus =
  | "registered"
  | "preliminary"
  | "final"
  | "amended"
  | "cancelled"
  | "entered-in-error"
  | "unknown";

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type FhirCodeableConcept = {
  coding?: FhirCoding[];
  text?: string;
};

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirAnnotation = {
  text?: string;
};

type FhirQuantity = {
  value?: number;
  unit?: string;
};

export type FhirObservation = {
  resourceType: "Observation";
  id?: string;
  status: FhirObservationStatus;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  performer?: FhirReference[];
  effectiveDateTime?: string;
  issued?: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueQuantity?: FhirQuantity;
  note?: FhirAnnotation[];
};

export type InternalObservationStatus =
  | "PRELIMINARY"
  | "FINAL"
  | "AMENDED"
  | "ENTERED_IN_ERROR";

export type InternalObservationValueType = "STRING" | "QUANTITY" | "BOOLEAN";

export type InternalObservation = {
  id: string;
  patientId: string;
  doctorId: string;
  clinicalVisitId?: string | null;
  status: InternalObservationStatus;
  code: string;
  codeSystem: string;
  codeDisplay?: string | null;
  categoryCode?: string | null;
  categorySystem?: string | null;
  categoryDisplay?: string | null;
  valueType: InternalObservationValueType;
  valueString?: string | null;
  valueQuantity?: number | null;
  valueBoolean?: boolean | null;
  valueUnit?: string | null;
  effectiveAt?: Date | string | null;
  issuedAt?: Date | string | null;
  notes?: string | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
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
};

export type InternalObservationDraft = {
  patientId: string;
  doctorId?: string | null;
  clinicalVisitId?: string | null;
  status: InternalObservationStatus;
  code: string;
  codeSystem: string;
  codeDisplay?: string | null;
  categoryCode?: string | null;
  categorySystem?: string | null;
  categoryDisplay?: string | null;
  valueType: InternalObservationValueType;
  valueString?: string | null;
  valueQuantity?: number | null;
  valueBoolean?: boolean | null;
  valueUnit?: string | null;
  effectiveAt?: Date | null;
  issuedAt?: Date | null;
  notes?: string | null;
};

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return undefined;
  return date.toISOString();
}

function parseDate(value: string | undefined, field: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Observation.${field} is invalid.`);
  }
  return parsed;
}

function parseReferenceId(reference: string | undefined, resourceType: string) {
  const normalized = clean(reference);
  if (!normalized) return null;
  const regex = new RegExp(`(?:^|/)${resourceType}/([^/]+)$`);
  const match = normalized.match(regex);
  return match?.[1] ?? normalized;
}

function toStatusFhir(status: InternalObservationStatus): FhirObservationStatus {
  switch (status) {
    case "PRELIMINARY":
      return "preliminary";
    case "FINAL":
      return "final";
    case "AMENDED":
      return "amended";
    case "ENTERED_IN_ERROR":
      return "entered-in-error";
    default:
      return "unknown";
  }
}

export function mapFhirObservationStatusToInternal(status: FhirObservationStatus): InternalObservationStatus {
  switch (status) {
    case "preliminary":
    case "registered":
      return "PRELIMINARY";
    case "amended":
      return "AMENDED";
    case "entered-in-error":
    case "cancelled":
      return "ENTERED_IN_ERROR";
    case "final":
    case "unknown":
    default:
      return "FINAL";
  }
}

function fullName(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => clean(part))
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();
}

export function mapInternalObservationToFhir(input: InternalObservation): FhirObservation {
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

  const resource: FhirObservation = {
    resourceType: "Observation",
    id: input.id,
    status: toStatusFhir(input.status),
    code: {
      coding: [
        {
          system: clean(input.codeSystem) ?? undefined,
          code: input.code,
          display: clean(input.codeDisplay) ?? undefined,
        },
      ],
      text: clean(input.codeDisplay) ?? undefined,
    },
    subject: {
      reference: `Patient/${input.patientId}`,
      display: patientDisplay ?? undefined,
    },
    performer: [
      {
        reference: `Practitioner/${input.doctorId}`,
        display: doctorDisplay ?? undefined,
      },
    ],
    effectiveDateTime: toIso(input.effectiveAt),
    issued: toIso(input.issuedAt),
    note: clean(input.notes) ? [{ text: clean(input.notes) ?? undefined }] : undefined,
  };

  if (input.clinicalVisitId) {
    resource.encounter = {
      reference: `Encounter/${input.clinicalVisitId}`,
    };
  }

  if (input.categoryCode || input.categorySystem || input.categoryDisplay) {
    resource.category = [
      {
        coding: [
          {
            code: clean(input.categoryCode) ?? undefined,
            system: clean(input.categorySystem) ?? undefined,
            display: clean(input.categoryDisplay) ?? undefined,
          },
        ],
        text: clean(input.categoryDisplay) ?? undefined,
      },
    ];
  }

  if (input.valueType === "STRING") {
    resource.valueString = clean(input.valueString) ?? undefined;
  } else if (input.valueType === "BOOLEAN") {
    resource.valueBoolean =
      typeof input.valueBoolean === "boolean" ? input.valueBoolean : undefined;
  } else {
    resource.valueQuantity = {
      value: typeof input.valueQuantity === "number" ? input.valueQuantity : undefined,
      unit: clean(input.valueUnit) ?? undefined,
    };
  }

  return resource;
}

export function mapFhirObservationToInternalDraft(resource: FhirObservation): InternalObservationDraft {
  const coding = resource.code?.coding?.[0];
  const code = clean(coding?.code);
  if (!code) {
    throw new Error("Observation.code.coding[0].code is required.");
  }

  const patientId = parseReferenceId(resource.subject?.reference, "Patient");
  if (!patientId) {
    throw new Error("Observation.subject.reference is required.");
  }

  const practitionerId = parseReferenceId(resource.performer?.[0]?.reference, "Practitioner");
  const encounterId = parseReferenceId(resource.encounter?.reference, "Encounter");

  const categoryCoding = resource.category?.[0]?.coding?.[0];

  let valueType: InternalObservationValueType;
  let valueString: string | null = null;
  let valueQuantity: number | null = null;
  let valueBoolean: boolean | null = null;
  let valueUnit: string | null = null;

  if (typeof resource.valueString === "string" && clean(resource.valueString)) {
    valueType = "STRING";
    valueString = clean(resource.valueString);
  } else if (typeof resource.valueBoolean === "boolean") {
    valueType = "BOOLEAN";
    valueBoolean = resource.valueBoolean;
  } else if (
    resource.valueQuantity &&
    typeof resource.valueQuantity.value === "number" &&
    Number.isFinite(resource.valueQuantity.value)
  ) {
    valueType = "QUANTITY";
    valueQuantity = resource.valueQuantity.value;
    valueUnit = clean(resource.valueQuantity.unit);
  } else {
    throw new Error("Observation requires valueString, valueBoolean or valueQuantity.");
  }

  return {
    patientId,
    doctorId: practitionerId,
    clinicalVisitId: encounterId,
    status: mapFhirObservationStatusToInternal(resource.status),
    code,
    codeSystem: clean(coding?.system) ?? "urn:medigest:observation-code",
    codeDisplay: clean(coding?.display) ?? clean(resource.code?.text),
    categoryCode: clean(categoryCoding?.code),
    categorySystem: clean(categoryCoding?.system),
    categoryDisplay: clean(categoryCoding?.display) ?? clean(resource.category?.[0]?.text),
    valueType,
    valueString,
    valueQuantity,
    valueBoolean,
    valueUnit,
    effectiveAt: parseDate(resource.effectiveDateTime, "effectiveDateTime"),
    issuedAt: parseDate(resource.issued, "issued"),
    notes: clean(resource.note?.[0]?.text),
  };
}
