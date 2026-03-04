import assert from "node:assert/strict";
import { buildSearchSetBundle } from "@/server/fhir/r4/bundle";
import { buildCapabilityStatement } from "@/server/fhir/r4/capabilityStatement";
import {
  FHIR_BASE_PATH,
  FHIR_JSON_CONTENT_TYPE,
  FHIR_R4_VERSION,
  RUN_IDENTIFIER_SYSTEM,
} from "@/server/fhir/r4/constants";
import { buildOperationOutcome, fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import {
  mapFhirAppointmentToInternalDraft,
  mapInternalAppointmentToFhir,
  type FhirAppointment,
} from "@/server/fhir/r4/mappers/appointment";
import {
  mapFhirObservationToInternalDraft,
  mapInternalObservationToFhir,
  type FhirObservation,
} from "@/server/fhir/r4/mappers/observation";
import {
  mapFhirPatientToInternalDraft,
  mapInternalPatientToFhir,
  type FhirPatient,
} from "@/server/fhir/r4/mappers/patient";

// Base URL de pruebas para simular rutas FHIR sin levantar el servidor.
const ORIGIN = "https://example.org";
const BASE_URL = `${ORIGIN}${FHIR_BASE_PATH}`;
// Catalogo de status permitidos en filtros de Appointment.
const ALLOWED_FHIR_APPOINTMENT_STATUSES = new Set([
  "proposed",
  "pending",
  "booked",
  "arrived",
  "fulfilled",
  "cancelled",
  "noshow",
  "entered-in-error",
  "checked-in",
  "waitlist",
]);
// Catalogo de status permitidos en filtros de Observation.
const ALLOWED_FHIR_OBSERVATION_STATUSES = new Set([
  "registered",
  "preliminary",
  "final",
  "amended",
  "cancelled",
  "entered-in-error",
  "unknown",
]);

// Estructura comun de objetos JSON parseados en la suite.
type JsonObject = Record<string, unknown>;
// Contexto que recibe cada asercion de caso.
type CaseContext = {
  id: string;
  response: Response;
  body: unknown;
};
// Estructura declarativa de un caso de prueba.
type ValidationCase = {
  id: string;
  cu: string;
  description: string;
  expectedStatus: number;
  run: () => Promise<Response>;
  assertBody: (context: CaseContext) => void;
};

// Fixture base de Patient para escenarios validos.
const internalPatient: Parameters<typeof mapInternalPatientToFhir>[0] = {
  id: "pat-100",
  firstName: "Ana",
  lastName: "Perez",
  secondLastName: "Lopez",
  run: "12.345.678-9",
  email: "ana@example.com",
  phone: "+56912345678",
  birthDate: "1990-06-15",
  gender: "femenino",
  address: "Calle 123",
  city: "Santiago",
};

// Fixture base de Appointment para escenarios validos.
const internalAppointment: Parameters<typeof mapInternalAppointmentToFhir>[0] = {
  id: "appt-100",
  patientId: "pat-100",
  doctorId: "doc-100",
  boxId: "box-100",
  startAt: "2026-03-04T13:00:00.000Z",
  endAt: "2026-03-04T13:30:00.000Z",
  status: "SCHEDULED",
  paymentStatus: "PENDING",
  notes: "Control anual",
  createdAt: "2026-03-03T10:00:00.000Z",
  patient: {
    firstName: "Ana",
    lastName: "Perez",
    secondLastName: "Lopez",
    run: "12.345.678-9",
  },
  doctor: {
    email: "doctor@example.com",
    profile: {
      firstName: "Mario",
      lastName: "Rojas",
    },
  },
  box: {
    name: "Box 100",
  },
};

// Fixture base de Observation para escenarios validos.
const internalObservation: Parameters<typeof mapInternalObservationToFhir>[0] = {
  id: "obs-100",
  patientId: "pat-100",
  doctorId: "doc-100",
  clinicalVisitId: "enc-100",
  status: "FINAL",
  code: "8867-4",
  codeSystem: "http://loinc.org",
  codeDisplay: "Heart rate",
  categoryCode: "vital-signs",
  categorySystem: "http://terminology.hl7.org/CodeSystem/observation-category",
  categoryDisplay: "Vital Signs",
  valueType: "QUANTITY",
  valueQuantity: 78,
  valueUnit: "/min",
  effectiveAt: "2026-03-04T13:10:00.000Z",
  issuedAt: "2026-03-04T13:11:00.000Z",
  notes: "Sin novedades",
};

// Fuerza unknown -> objeto JSON para aserciones tipadas.
function toJsonObject(value: unknown, label: string): JsonObject {
  assert.ok(value && typeof value === "object", `${label} must be an object.`);
  return value as JsonObject;
}

// Obtiene el Content-Type de una respuesta de forma segura.
function getContentType(response: Response) {
  return response.headers.get("content-type") ?? "";
}

// Verifica que la respuesta sea FHIR JSON.
function assertFhirJsonHeaders(response: Response, caseId: string) {
  const contentType = getContentType(response);
  assert.ok(
    contentType.startsWith(FHIR_JSON_CONTENT_TYPE),
    `[${caseId}] Expected Content-Type to start with ${FHIR_JSON_CONTENT_TYPE}. Received: ${contentType}`
  );
}

// Verifica resourceType exacto del payload.
function assertResourceType(body: unknown, expectedResourceType: string, caseId: string) {
  const payload = toJsonObject(body, `${caseId} payload`);
  assert.equal(
    payload.resourceType,
    expectedResourceType,
    `[${caseId}] Expected resourceType=${expectedResourceType}.`
  );
}

// Verifica estructura minima de OperationOutcome.
function assertOperationOutcome(body: unknown, caseId: string) {
  assertResourceType(body, "OperationOutcome", caseId);
  const payload = toJsonObject(body, `${caseId} payload`);
  assert.ok(Array.isArray(payload.issue), `[${caseId}] OperationOutcome.issue must be an array.`);
  const firstIssue = payload.issue[0] as JsonObject | undefined;
  assert.ok(firstIssue, `[${caseId}] OperationOutcome.issue[0] is required.`);
  assert.equal(typeof firstIssue.diagnostics, "string", `[${caseId}] diagnostics must be a string.`);
}

// Verifica estructura minima de Bundle searchset.
function assertBundle(body: unknown, expectedInnerResourceType: string, caseId: string) {
  assertResourceType(body, "Bundle", caseId);
  const payload = toJsonObject(body, `${caseId} payload`);
  assert.equal(payload.type, "searchset", `[${caseId}] Bundle.type must be searchset.`);
  assert.equal(typeof payload.total, "number", `[${caseId}] Bundle.total must be numeric.`);
  assert.ok(Array.isArray(payload.entry), `[${caseId}] Bundle.entry must be an array.`);

  const firstEntry = payload.entry[0] as JsonObject | undefined;
  assert.ok(firstEntry, `[${caseId}] Bundle.entry[0] is required for this case.`);
  const resource = toJsonObject(firstEntry.resource, `${caseId} Bundle.entry[0].resource`);
  assert.equal(
    resource.resourceType,
    expectedInnerResourceType,
    `[${caseId}] Entry resourceType must be ${expectedInnerResourceType}.`
  );
}

// Verifica header Location esperado en respuestas 201.
function assertCreatedLocation(response: Response, resourceType: string, resourceId: string, caseId: string) {
  const location = response.headers.get("location");
  assert.equal(
    location,
    `${BASE_URL}/${resourceType}/${resourceId}`,
    `[${caseId}] Location header mismatch.`
  );
}

// Parsea JSON de la respuesta y falla con mensaje claro si no es valido.
async function parseResponseBody(response: Response, caseId: string) {
  const raw = await response.text();
  assert.ok(raw.length > 0, `[${caseId}] Response body should not be empty.`);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`[${caseId}] Response body is not valid JSON.`);
  }
}

// Simula GET /api/fhir/r4 con link a metadata.
async function simulateBaseEndpoint() {
  const metadataUrl = `${BASE_URL}/metadata`;
  const outcome = buildOperationOutcome({
    severity: "information",
    code: "informational",
    diagnostics: `FHIR R4 base endpoint active. Use ${metadataUrl} to fetch CapabilityStatement.`,
  });

  return fhirJsonResponse(outcome, 200, {
    Link: `<${metadataUrl}>; rel="service-desc"`,
  });
}

// Simula GET /api/fhir/r4/metadata.
async function simulateMetadataEndpoint() {
  const capabilityStatement = buildCapabilityStatement(BASE_URL);
  return fhirJsonResponse(capabilityStatement, 200);
}

// Simula busqueda de Patient con resultado.
async function simulatePatientSearch() {
  const patient = mapInternalPatientToFhir(internalPatient);
  const bundle = buildSearchSetBundle(ORIGIN, "Patient", [{ resource: patient }]);
  return fhirJsonResponse(bundle, 200);
}

// Simula lectura de Patient existente o no encontrado.
async function simulatePatientRead(found: boolean) {
  if (!found) {
    return fhirErrorResponse(404, "Patient no encontrado.", "not-found");
  }
  const patient = mapInternalPatientToFhir(internalPatient);
  return fhirJsonResponse(patient, 200);
}

// Simula creacion de Patient, incluyendo casos invalidos.
async function simulatePatientCreate(body: unknown) {
  try {
    const resource = body as FhirPatient;
    if (resource?.resourceType !== "Patient") {
      return fhirErrorResponse(400, "El recurso debe ser Patient.", "invalid");
    }

    const draft = mapFhirPatientToInternalDraft(resource);
    if (draft.run === "11.111.111-1") {
      return fhirErrorResponse(409, "Paciente ya registrado.", "conflict");
    }

    const created = mapInternalPatientToFhir({
      id: "pat-created-100",
      firstName: draft.firstName,
      lastName: draft.lastName,
      secondLastName: draft.secondLastName ?? null,
      run: draft.run,
      email: draft.email ?? null,
      phone: draft.phone ?? null,
      birthDate: draft.birthDate ?? null,
      gender: draft.gender ?? null,
      address: draft.address ?? null,
      city: draft.city ?? null,
      emergencyContactName: draft.emergencyContactName ?? null,
      emergencyContactPhone: draft.emergencyContactPhone ?? null,
      isActive: draft.isActive,
    });

    return fhirJsonResponse(created, 201, {
      Location: `${BASE_URL}/Patient/${created.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear Patient.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Simula actualizacion de Patient, incluyendo validacion de id URL/cuerpo.
async function simulatePatientUpdate(pathId: string, body: unknown) {
  try {
    const resource = body as FhirPatient;
    if (resource?.resourceType !== "Patient") {
      return fhirErrorResponse(400, "El recurso debe ser Patient.", "invalid");
    }
    if (resource.id && resource.id !== pathId) {
      return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
    }

    const draft = mapFhirPatientToInternalDraft(resource);
    const updated = mapInternalPatientToFhir({
      id: pathId,
      firstName: draft.firstName,
      lastName: draft.lastName,
      secondLastName: draft.secondLastName ?? null,
      run: draft.run,
      email: draft.email ?? null,
      phone: draft.phone ?? null,
      birthDate: draft.birthDate ?? null,
      gender: draft.gender ?? null,
      address: draft.address ?? null,
      city: draft.city ?? null,
      emergencyContactName: draft.emergencyContactName ?? null,
      emergencyContactPhone: draft.emergencyContactPhone ?? null,
      isActive: draft.isActive,
    });
    return fhirJsonResponse(updated, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar Patient.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Simula busqueda de Appointment con validacion de status.
async function simulateAppointmentSearch(statusRaw?: string) {
  if (statusRaw && !ALLOWED_FHIR_APPOINTMENT_STATUSES.has(statusRaw)) {
    return fhirErrorResponse(400, "Appointment.status no valido para FHIR R4.", "invalid");
  }

  const appointment = mapInternalAppointmentToFhir(internalAppointment);
  const bundle = buildSearchSetBundle(ORIGIN, "Appointment", [{ resource: appointment }]);
  return fhirJsonResponse(bundle, 200);
}

// Simula lectura de Appointment existente o no encontrado.
async function simulateAppointmentRead(found: boolean) {
  if (!found) {
    return fhirErrorResponse(404, "Appointment no encontrado.", "not-found");
  }
  const appointment = mapInternalAppointmentToFhir(internalAppointment);
  return fhirJsonResponse(appointment, 200);
}

// Simula creacion de Appointment con validaciones basicas.
async function simulateAppointmentCreate(body: unknown) {
  try {
    const resource = body as FhirAppointment;
    if (resource?.resourceType !== "Appointment") {
      return fhirErrorResponse(400, "El recurso debe ser Appointment.", "invalid");
    }

    const draft = mapFhirAppointmentToInternalDraft(resource);
    if (draft.patientId === "pat-missing") {
      return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
    }

    const created = mapInternalAppointmentToFhir({
      id: "appt-created-100",
      patientId: draft.patientId,
      doctorId: draft.doctorId,
      boxId: draft.boxId,
      startAt: draft.startAt,
      endAt: draft.endAt,
      status: draft.status,
      paymentStatus: draft.paymentStatus,
      notes: draft.notes ?? null,
      createdAt: "2026-03-04T13:00:00.000Z",
      patient: {
        firstName: "Ana",
        lastName: "Perez",
        secondLastName: "Lopez",
      },
      doctor: {
        email: "doctor@example.com",
        profile: {
          firstName: "Mario",
          lastName: "Rojas",
        },
      },
      box: {
        name: "Box 100",
      },
    });

    return fhirJsonResponse(created, 201, {
      Location: `${BASE_URL}/Appointment/${created.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear Appointment.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Simula actualizacion de Appointment con validacion de id URL/cuerpo.
async function simulateAppointmentUpdate(pathId: string, body: unknown) {
  try {
    const resource = body as FhirAppointment;
    if (resource?.resourceType !== "Appointment") {
      return fhirErrorResponse(400, "El recurso debe ser Appointment.", "invalid");
    }
    if (resource.id && resource.id !== pathId) {
      return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
    }

    const draft = mapFhirAppointmentToInternalDraft(resource);
    const updated = mapInternalAppointmentToFhir({
      id: pathId,
      patientId: draft.patientId,
      doctorId: draft.doctorId,
      boxId: draft.boxId,
      startAt: draft.startAt,
      endAt: draft.endAt,
      status: draft.status,
      paymentStatus: draft.paymentStatus,
      notes: draft.notes ?? null,
      createdAt: "2026-03-04T13:00:00.000Z",
      patient: {
        firstName: "Ana",
        lastName: "Perez",
      },
      doctor: {
        profile: {
          firstName: "Mario",
          lastName: "Rojas",
        },
      },
      box: {
        name: "Box 100",
      },
    });
    return fhirJsonResponse(updated, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar Appointment.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Simula busqueda de Observation con validacion de status.
async function simulateObservationSearch(statusRaw?: string) {
  if (statusRaw && !ALLOWED_FHIR_OBSERVATION_STATUSES.has(statusRaw)) {
    return fhirErrorResponse(400, "Observation.status no valido para FHIR R4.", "invalid");
  }

  const observation = mapInternalObservationToFhir(internalObservation);
  const bundle = buildSearchSetBundle(ORIGIN, "Observation", [{ resource: observation }]);
  return fhirJsonResponse(bundle, 200);
}

// Simula lectura de Observation existente o no encontrado.
async function simulateObservationRead(found: boolean) {
  if (!found) {
    return fhirErrorResponse(404, "Observation no encontrada.", "not-found");
  }
  const observation = mapInternalObservationToFhir(internalObservation);
  return fhirJsonResponse(observation, 200);
}

// Simula creacion de Observation, incluyendo casos invalidos.
async function simulateObservationCreate(body: unknown) {
  try {
    const resource = body as FhirObservation;
    if (resource?.resourceType !== "Observation") {
      return fhirErrorResponse(400, "El recurso debe ser Observation.", "invalid");
    }

    const draft = mapFhirObservationToInternalDraft(resource);
    if (draft.patientId === "pat-missing") {
      return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
    }

    const created = mapInternalObservationToFhir({
      id: "obs-created-100",
      patientId: draft.patientId,
      doctorId: draft.doctorId ?? "doc-100",
      clinicalVisitId: draft.clinicalVisitId ?? null,
      status: draft.status,
      code: draft.code,
      codeSystem: draft.codeSystem,
      codeDisplay: draft.codeDisplay ?? null,
      categoryCode: draft.categoryCode ?? null,
      categorySystem: draft.categorySystem ?? null,
      categoryDisplay: draft.categoryDisplay ?? null,
      valueType: draft.valueType,
      valueString: draft.valueString ?? null,
      valueQuantity: draft.valueQuantity ?? null,
      valueBoolean: draft.valueBoolean ?? null,
      valueUnit: draft.valueUnit ?? null,
      effectiveAt: draft.effectiveAt ?? null,
      issuedAt: draft.issuedAt ?? null,
      notes: draft.notes ?? null,
    });

    return fhirJsonResponse(created, 201, {
      Location: `${BASE_URL}/Observation/${created.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear Observation.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Simula actualizacion de Observation con validacion de id URL/cuerpo.
async function simulateObservationUpdate(pathId: string, body: unknown) {
  try {
    const resource = body as FhirObservation;
    if (resource?.resourceType !== "Observation") {
      return fhirErrorResponse(400, "El recurso debe ser Observation.", "invalid");
    }
    if (resource.id && resource.id !== pathId) {
      return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
    }

    const draft = mapFhirObservationToInternalDraft(resource);
    const updated = mapInternalObservationToFhir({
      id: pathId,
      patientId: draft.patientId,
      doctorId: draft.doctorId ?? "doc-100",
      clinicalVisitId: draft.clinicalVisitId ?? null,
      status: draft.status,
      code: draft.code,
      codeSystem: draft.codeSystem,
      codeDisplay: draft.codeDisplay ?? null,
      categoryCode: draft.categoryCode ?? null,
      categorySystem: draft.categorySystem ?? null,
      categoryDisplay: draft.categoryDisplay ?? null,
      valueType: draft.valueType,
      valueString: draft.valueString ?? null,
      valueQuantity: draft.valueQuantity ?? null,
      valueBoolean: draft.valueBoolean ?? null,
      valueUnit: draft.valueUnit ?? null,
      effectiveAt: draft.effectiveAt ?? null,
      issuedAt: draft.issuedAt ?? null,
      notes: draft.notes ?? null,
    });
    return fhirJsonResponse(updated, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar Observation.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

// Construye payload valido de alta para Patient.
function buildPatientCreatePayload(): FhirPatient {
  const payload = mapInternalPatientToFhir({
    ...internalPatient,
    id: "pat-input-201",
  });
  delete payload.id;
  return payload;
}

// Construye payload invalido de Patient sin identifier RUN.
function buildPatientPayloadWithoutIdentifier(): FhirPatient {
  const payload = buildPatientCreatePayload();
  payload.identifier = [];
  return payload;
}

// Construye payload de update para Patient.
function buildPatientUpdatePayload(pathId: string): FhirPatient {
  const payload = buildPatientCreatePayload();
  payload.id = pathId;
  payload.name = [
    {
      ...payload.name?.[0],
      given: ["Ana Maria"],
    },
  ];
  return payload;
}

// Construye payload valido de alta para Appointment.
function buildAppointmentCreatePayload(): FhirAppointment {
  const payload = mapInternalAppointmentToFhir({
    ...internalAppointment,
    id: "appt-input-201",
  });
  delete payload.id;
  return payload;
}

// Construye payload invalido de Appointment sin participant Location.
function buildAppointmentPayloadWithoutLocation(): FhirAppointment {
  const payload = buildAppointmentCreatePayload();
  payload.participant = payload.participant.filter(
    (participant) => !participant.actor?.reference?.startsWith("Location/")
  );
  return payload;
}

// Construye payload de update para Appointment.
function buildAppointmentUpdatePayload(pathId: string): FhirAppointment {
  const payload = buildAppointmentCreatePayload();
  payload.id = pathId;
  payload.description = "Control actualizado";
  return payload;
}

// Construye payload valido de alta para Observation.
function buildObservationCreatePayload(): FhirObservation {
  const payload = mapInternalObservationToFhir({
    ...internalObservation,
    id: "obs-input-201",
  });
  delete payload.id;
  return payload;
}

// Construye payload invalido de Observation sin value[x].
function buildObservationPayloadWithoutValue(): FhirObservation {
  const payload = buildObservationCreatePayload();
  delete payload.valueString;
  delete payload.valueBoolean;
  delete payload.valueQuantity;
  return payload;
}

// Construye payload de update para Observation.
function buildObservationUpdatePayload(pathId: string): FhirObservation {
  const payload = buildObservationCreatePayload();
  payload.id = pathId;
  payload.note = [{ text: "Actualizado" }];
  return payload;
}

// Catalogo declarativo de casos que cubren CUs y escenarios validos/invalidos.
const cases: ValidationCase[] = [
  {
    id: "TC-CU1-BASE-GET-200",
    cu: "CU-FHIR-01",
    description: "Base endpoint retorna metadata link con OperationOutcome informativo.",
    expectedStatus: 200,
    run: () => simulateBaseEndpoint(),
    assertBody: ({ id, response, body }) => {
      assertOperationOutcome(body, id);
      const payload = toJsonObject(body, `${id} payload`);
      const issue = (payload.issue as JsonObject[])[0];
      assert.equal(issue.code, "informational", `[${id}] issue.code must be informational.`);
      const link = response.headers.get("link");
      assert.equal(
        link,
        `<${BASE_URL}/metadata>; rel="service-desc"`,
        `[${id}] Link header mismatch.`
      );
    },
  },
  {
    id: "TC-CU1-METADATA-GET-200",
    cu: "CU-FHIR-01",
    description: "Metadata retorna CapabilityStatement coherente con R4.",
    expectedStatus: 200,
    run: () => simulateMetadataEndpoint(),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "CapabilityStatement", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.fhirVersion, FHIR_R4_VERSION, `[${id}] fhirVersion mismatch.`);
      const format = payload.format as unknown[];
      assert.ok(Array.isArray(format), `[${id}] format must be an array.`);
      assert.ok(format.includes(FHIR_JSON_CONTENT_TYPE), `[${id}] format must include FHIR JSON.`);
    },
  },
  {
    id: "TC-CU2-PATIENT-SEARCH-200",
    cu: "CU-FHIR-02",
    description: "Patient search retorna Bundle searchset con recursos Patient.",
    expectedStatus: 200,
    run: () => simulatePatientSearch(),
    assertBody: ({ id, body }) => {
      assertBundle(body, "Patient", id);
    },
  },
  {
    id: "TC-CU2-PATIENT-READ-200",
    cu: "CU-FHIR-02",
    description: "Patient read retorna recurso Patient.",
    expectedStatus: 200,
    run: () => simulatePatientRead(true),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Patient", id);
      const payload = toJsonObject(body, `${id} payload`);
      const identifier = payload.identifier as JsonObject[] | undefined;
      assert.equal(identifier?.[0]?.system, RUN_IDENTIFIER_SYSTEM, `[${id}] RUN system mismatch.`);
    },
  },
  {
    id: "TC-CU2-PATIENT-READ-404",
    cu: "CU-FHIR-02",
    description: "Patient read inexistente retorna OperationOutcome not-found.",
    expectedStatus: 404,
    run: () => simulatePatientRead(false),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
      const payload = toJsonObject(body, `${id} payload`);
      const issue = (payload.issue as JsonObject[])[0];
      assert.equal(issue.code, "not-found", `[${id}] issue.code should be not-found.`);
    },
  },
  {
    id: "TC-CU3-PATIENT-CREATE-201",
    cu: "CU-FHIR-03",
    description: "Patient create valido retorna 201 + Location.",
    expectedStatus: 201,
    run: () => simulatePatientCreate(buildPatientCreatePayload()),
    assertBody: ({ id, response, body }) => {
      assertResourceType(body, "Patient", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.id, "pat-created-100", `[${id}] created patient id mismatch.`);
      assertCreatedLocation(response, "Patient", "pat-created-100", id);
    },
  },
  {
    id: "TC-CU3-PATIENT-CREATE-400",
    cu: "CU-FHIR-03",
    description: "Patient create invalido (sin RUN) retorna 400.",
    expectedStatus: 400,
    run: () => simulatePatientCreate(buildPatientPayloadWithoutIdentifier()),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU3-PATIENT-UPDATE-200",
    cu: "CU-FHIR-03",
    description: "Patient update valido retorna recurso actualizado.",
    expectedStatus: 200,
    run: () => simulatePatientUpdate("pat-100", buildPatientUpdatePayload("pat-100")),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Patient", id);
      const payload = toJsonObject(body, `${id} payload`);
      const name = payload.name as JsonObject[] | undefined;
      const given = name?.[0]?.given as unknown[] | undefined;
      assert.equal(given?.[0], "Ana Maria", `[${id}] expected updated first name.`);
    },
  },
  {
    id: "TC-CU3-PATIENT-UPDATE-400",
    cu: "CU-FHIR-03",
    description: "Patient update con id inconsistente retorna 400 invalid.",
    expectedStatus: 400,
    run: () => simulatePatientUpdate("pat-100", buildPatientUpdatePayload("pat-otro")),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
      const payload = toJsonObject(body, `${id} payload`);
      const issue = (payload.issue as JsonObject[])[0];
      assert.equal(issue.code, "invalid", `[${id}] issue.code should be invalid.`);
    },
  },
  {
    id: "TC-CU4-APPOINTMENT-SEARCH-200",
    cu: "CU-FHIR-04",
    description: "Appointment search valido retorna Bundle searchset.",
    expectedStatus: 200,
    run: () => simulateAppointmentSearch("booked"),
    assertBody: ({ id, body }) => {
      assertBundle(body, "Appointment", id);
    },
  },
  {
    id: "TC-CU4-APPOINTMENT-SEARCH-400",
    cu: "CU-FHIR-04",
    description: "Appointment search con status invalido retorna 400.",
    expectedStatus: 400,
    run: () => simulateAppointmentSearch("bad-status"),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU4-APPOINTMENT-READ-200",
    cu: "CU-FHIR-04",
    description: "Appointment read retorna Appointment valido.",
    expectedStatus: 200,
    run: () => simulateAppointmentRead(true),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Appointment", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.status, "booked", `[${id}] status mismatch.`);
    },
  },
  {
    id: "TC-CU4-APPOINTMENT-READ-404",
    cu: "CU-FHIR-04",
    description: "Appointment read inexistente retorna 404.",
    expectedStatus: 404,
    run: () => simulateAppointmentRead(false),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU5-APPOINTMENT-CREATE-201",
    cu: "CU-FHIR-05",
    description: "Appointment create valido retorna 201.",
    expectedStatus: 201,
    run: () => simulateAppointmentCreate(buildAppointmentCreatePayload()),
    assertBody: ({ id, response, body }) => {
      assertResourceType(body, "Appointment", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.id, "appt-created-100", `[${id}] created appointment id mismatch.`);
      assertCreatedLocation(response, "Appointment", "appt-created-100", id);
    },
  },
  {
    id: "TC-CU5-APPOINTMENT-CREATE-400",
    cu: "CU-FHIR-05",
    description: "Appointment create invalido (participant incompleto) retorna 400.",
    expectedStatus: 400,
    run: () => simulateAppointmentCreate(buildAppointmentPayloadWithoutLocation()),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU5-APPOINTMENT-UPDATE-200",
    cu: "CU-FHIR-05",
    description: "Appointment update valido retorna recurso actualizado.",
    expectedStatus: 200,
    run: () => simulateAppointmentUpdate("appt-100", buildAppointmentUpdatePayload("appt-100")),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Appointment", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.description, "Control actualizado", `[${id}] description mismatch.`);
    },
  },
  {
    id: "TC-CU5-APPOINTMENT-UPDATE-400",
    cu: "CU-FHIR-05",
    description: "Appointment update con id inconsistente retorna 400.",
    expectedStatus: 400,
    run: () => simulateAppointmentUpdate("appt-100", buildAppointmentUpdatePayload("appt-otro")),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
      const payload = toJsonObject(body, `${id} payload`);
      const issue = (payload.issue as JsonObject[])[0];
      assert.equal(issue.code, "invalid", `[${id}] issue.code should be invalid.`);
    },
  },
  {
    id: "TC-CU6-OBSERVATION-SEARCH-200",
    cu: "CU-FHIR-06",
    description: "Observation search valido retorna Bundle searchset.",
    expectedStatus: 200,
    run: () => simulateObservationSearch("final"),
    assertBody: ({ id, body }) => {
      assertBundle(body, "Observation", id);
    },
  },
  {
    id: "TC-CU6-OBSERVATION-SEARCH-400",
    cu: "CU-FHIR-06",
    description: "Observation search con status invalido retorna 400.",
    expectedStatus: 400,
    run: () => simulateObservationSearch("bad-status"),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU6-OBSERVATION-READ-200",
    cu: "CU-FHIR-06",
    description: "Observation read retorna Observation valido.",
    expectedStatus: 200,
    run: () => simulateObservationRead(true),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Observation", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.status, "final", `[${id}] status mismatch.`);
    },
  },
  {
    id: "TC-CU6-OBSERVATION-READ-404",
    cu: "CU-FHIR-06",
    description: "Observation read inexistente retorna 404.",
    expectedStatus: 404,
    run: () => simulateObservationRead(false),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU7-OBSERVATION-CREATE-201",
    cu: "CU-FHIR-07",
    description: "Observation create valido retorna 201.",
    expectedStatus: 201,
    run: () => simulateObservationCreate(buildObservationCreatePayload()),
    assertBody: ({ id, response, body }) => {
      assertResourceType(body, "Observation", id);
      const payload = toJsonObject(body, `${id} payload`);
      assert.equal(payload.id, "obs-created-100", `[${id}] created observation id mismatch.`);
      assertCreatedLocation(response, "Observation", "obs-created-100", id);
    },
  },
  {
    id: "TC-CU7-OBSERVATION-CREATE-400",
    cu: "CU-FHIR-07",
    description: "Observation create invalido (sin value[x]) retorna 400.",
    expectedStatus: 400,
    run: () => simulateObservationCreate(buildObservationPayloadWithoutValue()),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
    },
  },
  {
    id: "TC-CU7-OBSERVATION-UPDATE-200",
    cu: "CU-FHIR-07",
    description: "Observation update valido retorna recurso actualizado.",
    expectedStatus: 200,
    run: () => simulateObservationUpdate("obs-100", buildObservationUpdatePayload("obs-100")),
    assertBody: ({ id, body }) => {
      assertResourceType(body, "Observation", id);
      const payload = toJsonObject(body, `${id} payload`);
      const note = payload.note as JsonObject[] | undefined;
      assert.equal(note?.[0]?.text, "Actualizado", `[${id}] note mismatch.`);
    },
  },
  {
    id: "TC-CU7-OBSERVATION-UPDATE-400",
    cu: "CU-FHIR-07",
    description: "Observation update con id inconsistente retorna 400.",
    expectedStatus: 400,
    run: () => simulateObservationUpdate("obs-100", buildObservationUpdatePayload("obs-otro")),
    assertBody: ({ id, body }) => {
      assertOperationOutcome(body, id);
      const payload = toJsonObject(body, `${id} payload`);
      const issue = (payload.issue as JsonObject[])[0];
      assert.equal(issue.code, "invalid", `[${id}] issue.code should be invalid.`);
    },
  },
];

// Ejecuta un caso y valida status, headers y estructura del body.
async function executeValidationCase(validationCase: ValidationCase) {
  const response = await validationCase.run();
  assert.equal(
    response.status,
    validationCase.expectedStatus,
    `[${validationCase.id}] Expected status ${validationCase.expectedStatus} for ${validationCase.description}, received ${response.status}.`
  );
  assertFhirJsonHeaders(response, validationCase.id);
  const body = await parseResponseBody(response, validationCase.id);
  validationCase.assertBody({
    id: validationCase.id,
    response,
    body,
  });
}

// Punto de entrada que ejecuta toda la suite.
async function run() {
  for (const validationCase of cases) {
    await executeValidationCase(validationCase);
  }

  // eslint-disable-next-line no-console
  console.log(`FHIR validation suite passed: ${cases.length} cases (valid and invalid).`);
}

void run();
