import { FhirLinkResourceType } from "@prisma/client";
import { normalizeId } from "@/lib/normalize";
import { PatientsService } from "@/server/patients/PatientsService";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { buildSearchSetBundle } from "@/server/fhir/r4/bundle";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { mapErrorToHttpStatus, fhirErrorResponse } from "@/server/fhir/r4/response";
import {
  mapFhirPatientToInternalDraft,
  mapInternalPatientToFhir,
  type FhirPatient,
} from "@/server/fhir/r4/mappers/patient";
import { parseSearchIdentifier } from "@/server/fhir/r4/references";

type InternalPatientShape = Parameters<typeof mapInternalPatientToFhir>[0];

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

async function toFhirPatient(
  clinicId: string,
  internalPatient: InternalPatientShape
) {
  const link = await ensurePatientLink(clinicId, internalPatient.id, internalPatient.run);
  const resource = mapInternalPatientToFhir(internalPatient);
  resource.id = link.fhirId;
  return resource;
}

function getSearchQuery(searchParams: URLSearchParams) {
  return (
    searchParams.get("name") ??
    searchParams.get("family") ??
    searchParams.get("given") ??
    searchParams.get("q")
  );
}

async function resolvePatientByIdentifier(
  clinicId: string,
  identifierRaw: string
) {
  const identifier = parseSearchIdentifier(identifierRaw);
  if (!identifier) return null;

  const identifierSystem = identifier.system ?? RUN_IDENTIFIER_SYSTEM;
  const internalId = await FhirLinkService.resolveInternalId({
    clinicId,
    resourceType: FhirLinkResourceType.PATIENT,
    identifier: {
      system: identifierSystem,
      value: identifier.value,
    },
  });
  if (internalId) {
    return PatientsService.getById(clinicId, internalId);
  }

  const data = await PatientsService.list({
    clinicId,
    q: identifier.value,
    page: 1,
    pageSize: 50,
  });
  const expectedRun = normalizeId(identifier.value);
  return (
    data.items.find((item) => normalizeId(item.run) === expectedRun) ?? null
  );
}

export async function GET(req: Request) {
  try {
    const { clinicId } = await requireClinicSession();
    const { searchParams, origin } = new URL(req.url);

    const resourceId = searchParams.get("_id");
    if (resourceId) {
      const internalId =
        (await FhirLinkService.resolveInternalId({
          clinicId,
          resourceType: FhirLinkResourceType.PATIENT,
          fhirId: resourceId,
        })) ?? resourceId;
      const item = await PatientsService.getById(clinicId, internalId);
      if (!item) {
        return fhirJsonResponse(buildSearchSetBundle(origin, "Patient", []), 200);
      }
      const resource = await toFhirPatient(clinicId, item);
      return fhirJsonResponse(buildSearchSetBundle(origin, "Patient", [{ resource }]), 200);
    }

    const identifierRaw = searchParams.get("identifier");
    if (identifierRaw) {
      const item = await resolvePatientByIdentifier(clinicId, identifierRaw);
      if (!item) {
        return fhirJsonResponse(buildSearchSetBundle(origin, "Patient", []), 200);
      }
      const resource = await toFhirPatient(clinicId, item);
      return fhirJsonResponse(buildSearchSetBundle(origin, "Patient", [{ resource }]), 200);
    }

    const count = Number(searchParams.get("_count") ?? "20");
    const pageSize = Number.isFinite(count) ? Math.min(Math.max(1, count), 100) : 20;
    const q = getSearchQuery(searchParams);
    const list = await PatientsService.list({
      clinicId,
      q,
      page: 1,
      pageSize,
    });

    const resources = await Promise.all(
      list.items.map(async (item) => ({
        resource: await toFhirPatient(clinicId, item),
      }))
    );
    return fhirJsonResponse(buildSearchSetBundle(origin, "Patient", resources), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo buscar Patient.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = (await req.json()) as FhirPatient;
    if (body?.resourceType !== "Patient") {
      return fhirErrorResponse(400, "El recurso debe ser Patient.", "invalid");
    }

    const draft = mapFhirPatientToInternalDraft(body);
    const item = await PatientsService.create({
      clinicId: session.clinicId,
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

    const { origin } = new URL(req.url);
    return fhirJsonResponse(resource, 201, {
      Location: `${origin}/api/fhir/r4/Patient/${resource.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear Patient.";
    const status = message.toLowerCase().includes("registrado") ? 409 : mapErrorToHttpStatus(message);
    return fhirErrorResponse(status, message);
  }
}

