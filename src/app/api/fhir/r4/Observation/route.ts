import { FhirLinkResourceType } from "@prisma/client";
import { requireRole } from "@/server/auth/requireSession";
import { requireFhirClinicSession } from "@/server/fhir/r4/access";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { buildSearchSetBundle } from "@/server/fhir/r4/bundle";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import { parseFhirReferenceId } from "@/server/fhir/r4/references";
import { ObservationsService, type ObservationInput } from "@/server/observations/ObservationsService";
import { withFhirTransaction } from "@/server/fhir/r4/transaction";
import {
  mapFhirObservationStatusToInternal,
  mapFhirObservationToInternalDraft,
  mapInternalObservationToFhir,
  type FhirObservation,
} from "@/server/fhir/r4/mappers/observation";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";

type InternalObservationShape = Parameters<typeof mapInternalObservationToFhir>[0];

const ALLOWED_FHIR_OBSERVATION_STATUSES = new Set([
  "registered",
  "preliminary",
  "final",
  "amended",
  "cancelled",
  "entered-in-error",
  "unknown",
]);

async function ensureObservationLink(clinicId: string, internalId: string) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: FhirLinkResourceType.OBSERVATION,
    internalId,
    fhirId: internalId,
  });
}

async function ensurePatientLink(clinicId: string, patient: { id: string; run: string | null | undefined }) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: FhirLinkResourceType.PATIENT,
    internalId: patient.id,
    fhirId: patient.id,
    identifier: patient.run
      ? {
          system: RUN_IDENTIFIER_SYSTEM,
          value: patient.run,
        }
      : null,
  });
}

async function toFhirObservation(clinicId: string, item: InternalObservationShape) {
  const [observationLink, patientLink] = await Promise.all([
    ensureObservationLink(clinicId, item.id),
    ensurePatientLink(clinicId, { id: item.patientId, run: item.patient?.run }),
  ]);

  const resource = mapInternalObservationToFhir(item);
  resource.id = observationLink.fhirId;
  resource.subject.reference = `Patient/${patientLink.fhirId}`;
  return resource;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

async function resolvePatientInternalId(clinicId: string, patientReferenceOrId: string) {
  const patientFhirId = parseFhirReferenceId(patientReferenceOrId, "Patient");
  if (!patientFhirId) return null;
  return (
    (await FhirLinkService.resolveInternalId({
      clinicId,
      resourceType: FhirLinkResourceType.PATIENT,
      fhirId: patientFhirId,
    })) ?? patientFhirId
  );
}

export const GET = withFhirTransaction(
  {
    interaction: "Observation.search",
    rateLimitScope: "/api/fhir/r4/Observation",
  },
  async (req: Request) => {
    try {
      const session = await requireFhirClinicSession(req);
      const { origin, searchParams } = new URL(req.url);

      const resourceId = searchParams.get("_id");
      if (resourceId) {
        const internalId =
          (await FhirLinkService.resolveInternalId({
            clinicId: session.clinicId,
            resourceType: FhirLinkResourceType.OBSERVATION,
            fhirId: resourceId,
          })) ?? resourceId;

        const item = await ObservationsService.getById(
          session.clinicId,
          internalId,
          session.role === "DOCTOR" ? session.userId : undefined
        );
        if (!item) {
          return fhirJsonResponse(buildSearchSetBundle(origin, "Observation", []), 200);
        }
        const resource = await toFhirObservation(session.clinicId, item);
        return fhirJsonResponse(buildSearchSetBundle(origin, "Observation", [{ resource }]), 200);
      }

      const patientRaw = searchParams.get("subject") ?? searchParams.get("patient");
      const patientId = patientRaw
        ? await resolvePatientInternalId(session.clinicId, patientRaw)
        : null;

      const encounterRaw = searchParams.get("encounter");
      const clinicalVisitId = parseFhirReferenceId(encounterRaw, "Encounter");

      const code = searchParams.get("code");
      const date = parseDate(searchParams.get("date"));
      const from = parseDate(searchParams.get("from")) ?? (date ? new Date(date) : null);
      const to =
        parseDate(searchParams.get("to")) ??
        (date
          ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
          : null);

      const statusRaw = searchParams.get("status");
      if (statusRaw && !ALLOWED_FHIR_OBSERVATION_STATUSES.has(statusRaw)) {
        return fhirErrorResponse(400, "Observation.status no valido para FHIR R4.", "invalid");
      }
      const status = statusRaw
        ? mapFhirObservationStatusToInternal(statusRaw as FhirObservation["status"])
        : null;

      const list = await ObservationsService.list({
        clinicId: session.clinicId,
        doctorId: session.role === "DOCTOR" ? session.userId : null,
        patientId,
        clinicalVisitId,
        code,
        status: status as ObservationInput["status"] | null,
        from,
        to,
      });

      const resources = await Promise.all(
        list.map(async (item: InternalObservationShape) => ({
          resource: await toFhirObservation(session.clinicId, item),
        }))
      );
      return fhirJsonResponse(buildSearchSetBundle(origin, "Observation", resources), 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo buscar Observation.";
      return fhirErrorResponse(mapErrorToHttpStatus(message), message);
    }
  }
);

export const POST = withFhirTransaction(
  {
    interaction: "Observation.create",
    rateLimitScope: "/api/fhir/r4/Observation",
  },
  async (req: Request) => {
    try {
      const session = await requireFhirClinicSession(req);
      requireRole(session.role, ["DOCTOR"]);

      const body = (await req.json()) as FhirObservation;
      if (body?.resourceType !== "Observation") {
        return fhirErrorResponse(400, "El recurso debe ser Observation.", "invalid");
      }

      const draft = mapFhirObservationToInternalDraft(body);
      const patientId = await resolvePatientInternalId(session.clinicId, draft.patientId);
      if (!patientId) {
        return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
      }

      const input: ObservationInput = {
        clinicId: session.clinicId,
        patientId,
        doctorId: session.userId,
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
      };

      const item = await ObservationsService.create(input);
      const resource = await toFhirObservation(session.clinicId, item);
      const { origin } = new URL(req.url);
      return fhirJsonResponse(resource, 201, {
        Location: `${origin}/api/fhir/r4/Observation/${resource.id}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear Observation.";
      const status = mapErrorToHttpStatus(message);
      return fhirErrorResponse(status, message);
    }
  }
);
