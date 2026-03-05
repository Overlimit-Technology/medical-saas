import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";

// Tipos FHIR minimos que usamos en este mapper (no cubren todo el recurso oficial).
type FhirGender = "male" | "female" | "other" | "unknown";
type FhirTelecomSystem = "phone" | "email";

type FhirIdentifier = {
  use?: string;
  system?: string;
  value?: string;
};

type FhirHumanName = {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
};

type FhirContactPoint = {
  system?: FhirTelecomSystem;
  value?: string;
  use?: string;
};

type FhirAddress = {
  text?: string;
  city?: string;
};

type FhirPatientContact = {
  name?: { text?: string };
  telecom?: FhirContactPoint[];
};

export type FhirPatient = {
  resourceType: "Patient";
  id?: string;
  active?: boolean;
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: FhirGender;
  birthDate?: string;
  address?: FhirAddress[];
  contact?: FhirPatientContact[];
};

// Forma del paciente interno necesaria para convertir a FHIR.
export type InternalPatient = {
  id: string;
  isActive?: boolean | null;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: Date | string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

// Forma interna "draft" usada cuando viene un Patient FHIR de entrada.
export type InternalPatientDraft = {
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  isActive?: boolean;
};

// Limpia strings vacios para no serializar basura en FHIR.
function clean(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

// Elimina null/undefined y deja solo valores validos.
function compact<T>(items: Array<T | null | undefined>) {
  return items.filter((item): item is T => item != null);
}

// Convierte fecha interna a formato FHIR date (YYYY-MM-DD).
function toDateOnly(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return undefined;
  return date.toISOString().slice(0, 10);
}

// Valida y convierte FHIR birthDate a Date interna.
function toInternalBirthDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error("Patient.birthDate is invalid.");
  }
  return date;
}

// Mapea genero interno libre a codigos FHIR permitidos.
function toFhirGender(value: string | null | undefined): FhirGender | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["male", "masculino", "m"].includes(normalized)) return "male";
  if (["female", "femenino", "f"].includes(normalized)) return "female";
  if (["other", "otro"].includes(normalized)) return "other";
  return "unknown";
}

// Mapea genero FHIR a etiqueta interna actual del sistema.
function toInternalGender(value: FhirGender | undefined) {
  if (!value) return null;
  if (value === "male") return "MASCULINO";
  if (value === "female") return "FEMENINO";
  if (value === "other") return "OTRO";
  return null;
}

// Separa apellido principal y segundo apellido desde family.
function splitFamilyName(family: string | undefined) {
  const normalized = clean(family);
  if (!normalized) return { lastName: "", secondLastName: null as string | null };
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lastName: parts[0] ?? "", secondLastName: null as string | null };
  }
  return {
    lastName: parts[0] ?? "",
    secondLastName: parts.slice(1).join(" "),
  };
}

// Busca RUN en identifier usando primero el system oficial y luego fallback.
function extractRunIdentifier(identifiers: FhirIdentifier[] | undefined) {
  if (!identifiers || identifiers.length === 0) return null;

  const withSystem = identifiers.find(
    (identifier) => clean(identifier.system) === RUN_IDENTIFIER_SYSTEM && clean(identifier.value)
  );
  if (withSystem?.value) return withSystem.value.trim();

  const fallback = identifiers.find((identifier) => clean(identifier.value));
  return fallback?.value?.trim() ?? null;
}

// Obtiene email/phone desde telecom segun system.
function extractTelecomValue(
  telecom: FhirContactPoint[] | undefined,
  system: FhirTelecomSystem
) {
  return telecom?.find((item) => item.system === system)?.value?.trim() ?? null;
}

// Convierte el modelo interno de paciente al recurso FHIR Patient.
export function mapInternalPatientToFhir(patient: InternalPatient): FhirPatient {
  const resource: FhirPatient = {
    resourceType: "Patient",
    id: patient.id,
  };

  if (typeof patient.isActive === "boolean") {
    resource.active = patient.isActive;
  }

  const run = clean(patient.run);
  if (run) {
    resource.identifier = [
      {
        use: "official",
        system: RUN_IDENTIFIER_SYSTEM,
        value: run,
      },
    ];
  }

  const family = compact([clean(patient.lastName), clean(patient.secondLastName)]).join(" ").trim();
  resource.name = [
    {
      use: "official",
      family: family || undefined,
      given: compact([clean(patient.firstName)]),
      text: compact([clean(patient.firstName), family || null]).join(" ").trim() || undefined,
    },
  ];

  const telecom = compact<FhirContactPoint>([
    clean(patient.email)
      ? {
          system: "email",
          value: clean(patient.email) ?? undefined,
        }
      : null,
    clean(patient.phone)
      ? {
          system: "phone",
          value: clean(patient.phone) ?? undefined,
        }
      : null,
  ]);
  if (telecom.length > 0) {
    resource.telecom = telecom;
  }

  const gender = toFhirGender(patient.gender);
  if (gender) {
    resource.gender = gender;
  }

  const birthDate = toDateOnly(patient.birthDate);
  if (birthDate) {
    resource.birthDate = birthDate;
  }

  if (clean(patient.address) || clean(patient.city)) {
    resource.address = [
      {
        text: clean(patient.address) ?? undefined,
        city: clean(patient.city) ?? undefined,
      },
    ];
  }

  const emergencyName = clean(patient.emergencyContactName);
  const emergencyPhone = clean(patient.emergencyContactPhone);
  if (emergencyName || emergencyPhone) {
    resource.contact = [
      {
        name: emergencyName ? { text: emergencyName } : undefined,
        telecom: emergencyPhone
          ? [
              {
                system: "phone",
                value: emergencyPhone,
              },
            ]
          : undefined,
      },
    ];
  }

  return resource;
}

// Convierte Patient FHIR a borrador interno con validaciones minimas obligatorias.
export function mapFhirPatientToInternalDraft(resource: FhirPatient): InternalPatientDraft {
  const primaryName = resource.name?.[0];
  const firstName = clean(primaryName?.given?.[0]) ?? clean(primaryName?.text?.split(" ")[0]);
  const family = splitFamilyName(primaryName?.family);
  const run = extractRunIdentifier(resource.identifier);

  if (!firstName) {
    throw new Error("Patient.name[0].given[0] is required.");
  }
  if (!family.lastName) {
    throw new Error("Patient.name[0].family is required.");
  }
  if (!run) {
    throw new Error("Patient.identifier (RUN) is required.");
  }

  const draft: InternalPatientDraft = {
    firstName,
    lastName: family.lastName,
    run,
  };

  if (family.secondLastName) {
    draft.secondLastName = family.secondLastName;
  }

  const email = extractTelecomValue(resource.telecom, "email");
  if (email) {
    draft.email = email;
  }

  const phone = extractTelecomValue(resource.telecom, "phone");
  if (phone) {
    draft.phone = phone;
  }

  const birthDate = toInternalBirthDate(resource.birthDate);
  if (birthDate) {
    draft.birthDate = birthDate;
  }

  draft.gender = toInternalGender(resource.gender);

  const address = resource.address?.[0];
  if (clean(address?.text)) {
    draft.address = clean(address?.text);
  }
  if (clean(address?.city)) {
    draft.city = clean(address?.city);
  }

  const emergency = resource.contact?.[0];
  if (clean(emergency?.name?.text)) {
    draft.emergencyContactName = clean(emergency?.name?.text);
  }
  if (clean(emergency?.telecom?.find((item) => item.system === "phone")?.value)) {
    draft.emergencyContactPhone = clean(
      emergency?.telecom?.find((item) => item.system === "phone")?.value
    );
  }

  if (typeof resource.active === "boolean") {
    draft.isActive = resource.active;
  }

  return draft;
}
