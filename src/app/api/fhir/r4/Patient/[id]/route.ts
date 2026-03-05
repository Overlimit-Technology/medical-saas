import { FhirLinkResourceType } from "@prisma/client";
import { requireRole } from "@/server/auth/requireSession";
import { PatientsService } from "@/server/patients/PatientsService";
import { requireFhirClinicSession } from "@/server/fhir/r4/access";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import { withFhirTransaction } from "@/server/fhir/r4/transaction";
import {
  mapFhirPatientToInternalDraft,
  mapInternalPatientToFhir,
  type FhirPatient,
} from "@/server/fhir/r4/mappers/patient";

async function resolvePatientInternalId(clinicId: string, fhirId: string) {
  return (
    (await FhirLinkService.resolveInternalId({
      clinicId,
      resourceType: FhirLinkResourceType.PATIENT,
      fhirId,
    })) ?? fhirId
  );
}

async function ensurePatientLink(
  clinicId: string,
  internalId: string,
  run?: string | null
) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: FhirLinkResourceType.PATIENT,
    internalId,
    fhirId: internalId,
    identifier: run
      ? {
          system: RUN_IDENTIFIER_SYSTEM,
          value: run,
        }
      : null,
  });
}

export const GET = withFhirTransaction(
  {
    interaction: "Patient.read",
    rateLimitScope: "/api/fhir/r4/Patient/[id]",
  },
  async (
    req: Request,
    { params }: { params: { id: string } }
  ) => {
    try {
      const { clinicId } = await requireFhirClinicSession(req);
      const internalId = await resolvePatientInternalId(clinicId, params.id);
      const item = await PatientsService.getById(clinicId, internalId);
      if (!item) {
        return fhirErrorResponse(404, "Patient no encontrado.", "not-found");
      }

      const link = await ensurePatientLink(clinicId, item.id, item.run);
      const resource = mapInternalPatientToFhir(item);
      resource.id = link.fhirId;
      return fhirJsonResponse(resource, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo obtener Patient.";
      return fhirErrorResponse(mapErrorToHttpStatus(message), message);
    }
  }
);

export const PUT = withFhirTransaction(
  {
    interaction: "Patient.update",
    rateLimitScope: "/api/fhir/r4/Patient/[id]",
  },
  async (
    req: Request,
    { params }: { params: { id: string } }
  ) => {
    try {
      const session = await requireFhirClinicSession(req);
      requireRole(session.role, ["ADMIN", "SECRETARY"]);

      const body = (await req.json()) as FhirPatient;
      if (body?.resourceType !== "Patient") {
        return fhirErrorResponse(400, "El recurso debe ser Patient.", "invalid");
      }
      if (body.id && body.id !== params.id) {
        return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
      }

      const internalId = await resolvePatientInternalId(session.clinicId, params.id);
      const draft = mapFhirPatientToInternalDraft(body);

      const item = await PatientsService.update(internalId, session.clinicId, {
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
      });

      const link = await ensurePatientLink(session.clinicId, item.id, item.run);
      const resource = mapInternalPatientToFhir(item);
      resource.id = link.fhirId;
      return fhirJsonResponse(resource, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar Patient.";
      const status = message.toLowerCase().includes("registrado") ? 409 : mapErrorToHttpStatus(message);
      return fhirErrorResponse(status, message);
    }
  }
);
