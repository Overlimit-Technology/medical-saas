// CapabilityStatement: documento que expone que soporta este servidor FHIR.

import { FHIR_JSON_CONTENT_TYPE, FHIR_R4_VERSION } from "@/server/fhir/r4/constants";

// Recursos declarados en esta fase para metadata FHIR.
type CapabilityResourceType = "Patient" | "Appointment" | "Encounter" | "Observation";

// Helper para armar cada entrada rest.resource con interacciones soportadas.
function buildResource(
  type: CapabilityResourceType,
  documentation: string,
  interactions?: Array<"read" | "search-type" | "create" | "update">
) {
  return {
    type,
    documentation,
    interaction: interactions?.map((code) => ({ code })),
  };
}

// Construye el CapabilityStatement usando la URL base del entorno actual.
export function buildCapabilityStatement(baseUrl: string) {
  return {
    resourceType: "CapabilityStatement",
    id: "medigest-fhir-r4",
    url: `${baseUrl}/metadata`,
    version: "0.1.0",
    name: "MediGestFHIRR4CapabilityStatement",
    title: "MediGest FHIR R4 Capability Statement",
    status: "active",
    experimental: false,
    date: new Date().toISOString(),
    publisher: "MediGest",
    kind: "instance",
    software: {
      name: "MediGest",
      version: "0.1.0",
    },
    implementation: {
      description: "FHIR R4 facade over MediGest internal API",
      url: baseUrl,
    },
    fhirVersion: FHIR_R4_VERSION,
    format: [FHIR_JSON_CONTENT_TYPE],
    rest: [
      {
        // En esta fase nos declaramos como servidor con recursos activados por ticket.
        mode: "server",
        documentation:
          "Bootstrap phase: metadata is active. Resource endpoints are enabled incrementally per HL7 tickets.",
        security: {
          cors: false,
          description:
            "Clinical FHIR endpoints must enforce authentication, authorization, and clinic scoping.",
        },
        resource: [
          buildResource(
            "Patient",
            "Baseline interactions active: read, search-type, create, update (HL7-003, HL7-007, HL7-008).",
            ["read", "search-type", "create", "update"]
          ),
          buildResource(
            "Appointment",
            "Baseline interactions active: read, search-type, create, update (HL7-004, HL7-007, HL7-008).",
            ["read", "search-type", "create", "update"]
          ),
          buildResource(
            "Observation",
            "Baseline interactions active: read, search-type, create, update (HL7-006).",
            ["read", "search-type", "create", "update"]
          ),
          buildResource("Encounter", "Planned only when CU-3 is active (HL7-005)."),
        ],
      },
    ],
  };
}
