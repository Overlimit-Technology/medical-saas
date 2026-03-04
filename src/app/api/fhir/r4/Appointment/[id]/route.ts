import { FhirLinkResourceType } from "@prisma/client";
import { AppointmentsService, type AppointmentInput } from "@/server/appointments/AppointmentsService";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import {
  mapFhirAppointmentToInternalDraft,
  mapInternalAppointmentToFhir,
  type FhirAppointment,
} from "@/server/fhir/r4/mappers/appointment";
import { parseFhirReferenceId } from "@/server/fhir/r4/references";

type InternalAppointmentShape = Parameters<typeof mapInternalAppointmentToFhir>[0];

async function ensureAppointmentLink(clinicId: string, internalId: string) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: FhirLinkResourceType.APPOINTMENT,
    internalId,
    fhirId: internalId,
  });
}

async function ensurePatientLink(clinicId: string, internalPatient: { id: string; run: string }) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: FhirLinkResourceType.PATIENT,
    internalId: internalPatient.id,
    fhirId: internalPatient.id,
    identifier: {
      system: RUN_IDENTIFIER_SYSTEM,
      value: internalPatient.run,
    },
  });
}

async function toFhirAppointment(clinicId: string, item: InternalAppointmentShape) {
  const [appointmentLink, patientLink] = await Promise.all([
    ensureAppointmentLink(clinicId, item.id),
    ensurePatientLink(clinicId, { id: item.patientId, run: item.patient?.run ?? "" }),
  ]);

  const resource = mapInternalAppointmentToFhir(item);
  resource.id = appointmentLink.fhirId;

  const patientParticipant = resource.participant.find(
    (participant) => participant.actor?.reference?.startsWith("Patient/")
  );
  if (patientParticipant?.actor) {
    patientParticipant.actor.reference = `Patient/${patientLink.fhirId}`;
  }

  return resource;
}

async function resolveAppointmentInternalId(clinicId: string, fhirId: string) {
  return (
    (await FhirLinkService.resolveInternalId({
      clinicId,
      resourceType: FhirLinkResourceType.APPOINTMENT,
      fhirId,
    })) ?? fhirId
  );
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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireClinicSession();
    const internalId = await resolveAppointmentInternalId(session.clinicId, params.id);
    const item = await prisma.appointment.findFirst({
      where: {
        id: internalId,
        clinicId: session.clinicId,
        doctorId: session.role === "DOCTOR" ? session.userId : undefined,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        box: true,
      },
    });

    if (!item) {
      return fhirErrorResponse(404, "Appointment no encontrado.", "not-found");
    }

    const resource = await toFhirAppointment(session.clinicId, item);
    return fhirJsonResponse(resource, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener Appointment.";
    return fhirErrorResponse(mapErrorToHttpStatus(message), message);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = (await req.json()) as FhirAppointment;
    if (body?.resourceType !== "Appointment") {
      return fhirErrorResponse(400, "El recurso debe ser Appointment.", "invalid");
    }
    if (body.id && body.id !== params.id) {
      return fhirErrorResponse(400, "El id del recurso no coincide con la URL.", "invalid");
    }

    const internalAppointmentId = await resolveAppointmentInternalId(session.clinicId, params.id);
    const draft = mapFhirAppointmentToInternalDraft(body);
    const patientId = await resolvePatientInternalId(session.clinicId, draft.patientId);
    if (!patientId) {
      return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
    }

    const data: Partial<AppointmentInput> = {
      patientId,
      doctorId: draft.doctorId,
      boxId: draft.boxId,
      startAt: draft.startAt,
      endAt: draft.endAt,
      status: draft.status,
      paymentStatus: draft.paymentStatus,
      notes: draft.notes ?? null,
      createdBy: session.userId,
    };

    const item = await AppointmentsService.update(internalAppointmentId, session.clinicId, data);
    const resource = await toFhirAppointment(session.clinicId, item);
    return fhirJsonResponse(resource, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar Appointment.";
    const lower = message.toLowerCase();
    const status = lower.includes("conflicto") || lower.includes("conflict") ? 409 : mapErrorToHttpStatus(message);
    return fhirErrorResponse(status, message);
  }
}
