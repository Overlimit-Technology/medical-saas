import { FhirLinkResourceType } from "@prisma/client";
import { requireRole } from "@/server/auth/requireSession";
import { requireFhirClinicSession } from "@/server/fhir/r4/access";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import { ObservationsService, type ObservationInput } from "@/server/observations/ObservationsService";
import { withFhirTransaction } from "@/server/fhir/r4/transaction";
import {
  mapFhirObservationToInternalDraft,
  mapInternalObservationToFhir,
  type FhirObservation,
} from "@/server/fhir/r4/mappers/observation";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";

type InternalObservationShape = Parameters<typeof mapInternalObservationToFhir>[0];

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

async function resolveObservationInternalId(clinicId: string, fhirId: string) {
  return (
    (await FhirLinkService.resolveInternalId({
      clinicId,
      resourceType: FhirLinkResourceType.OBSERVATION,
      fhirId,
    })) ?? fhirId
  );
}

async function resolvePatientInternalId(clinicId: string, patientFhirIdOrInternalId: string) {
  return (
    (await FhirLinkService.resolveInternalId({
      clinicId,
      resourceType: FhirLinkResourceType.PATIENT,
      fhirId: patientFhirIdOrInternalId,
    })) ?? patientFhirIdOrInternalId
  );
}

export const GET = withFhirTransaction(
  {
    interaction: "Observation.read",
    rateLimitScope: "/api/fhir/r4/Observation/[id]",
  },
  async (
    req: Request,
    { params }: { params: { id: string } }
  ) => {
    try {
      const session = await requireFhirClinicSession(req);
      const internalId = await resolveObservationInternalId(session.clinicId, params.id);
      const item = await ObservationsService.getById(
        session.clinicId,
        internalId,
        session.role === "DOCTOR" ? session.userId : undefined
      );
      if (!item) {
        return fhirErrorResponse(404, "Observation no encontrada.", "not-found");
      }

      const resource = await toFhirObservation(session.clinicId, item);
      return fhirJsonResponse(resource, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo obtener Observation.";
      return fhirErrorResponse(mapErrorToHttpStatus(message), message);
    }
  }
);

export const PUT = withFhirTransaction(
  {
    interaction: "Observation.update",
    rateLimitScope: "/api/fhir/r4/Observation/[id]",
  },
  async (
    req: Request,
    { params }: { params: { id: string } }
  ) => {
    try {
      const session = await requireFhirClinicSession(req);
      requireRole(session.role, ["DOCTOR"]);

      const body = (await req.json()) as FhirObservation;
      if (body?.resourceType !== "Observation") {
        return fhirErrorResponse(400, "El recurso debe ser Observation.", "invalid");
      }
      if (body.id && body.id !== params.id) {
        return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
      }

      const internalObservationId = await resolveObservationInternalId(session.clinicId, params.id);
      const draft = mapFhirObservationToInternalDraft(body);
      const patientId = await resolvePatientInternalId(session.clinicId, draft.patientId);
      if (!patientId) {
        return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
      }

      const data: Partial<ObservationInput> = {
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

      const item = await ObservationsService.update(internalObservationId, session.clinicId, data);
      const resource = await toFhirObservation(session.clinicId, item);
      return fhirJsonResponse(resource, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar Observation.";
      return fhirErrorResponse(mapErrorToHttpStatus(message), message);
    }
  }
);
