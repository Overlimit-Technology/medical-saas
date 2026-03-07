import { AppointmentsService, type AppointmentInput } from "@/server/appointments/AppointmentsService";
import { requireRole } from "@/server/auth/requireSession";
import { requireFhirClinicSession } from "@/server/fhir/r4/access";
import { prisma } from "@/lib/prisma";
import { FhirLinkService } from "@/server/fhir/r4/FhirLinkService";
import { RUN_IDENTIFIER_SYSTEM } from "@/server/fhir/r4/constants";
import { buildSearchSetBundle } from "@/server/fhir/r4/bundle";
import { fhirJsonResponse } from "@/server/fhir/r4/http";
import { fhirErrorResponse, mapErrorToHttpStatus } from "@/server/fhir/r4/response";
import { withFhirTransaction } from "@/server/fhir/r4/transaction";
import {
  mapFhirAppointmentStatusToInternal,
  mapFhirAppointmentToInternalDraft,
  mapInternalAppointmentToFhir,
  type FhirAppointment,
} from "@/server/fhir/r4/mappers/appointment";
import { parseFhirReferenceId } from "@/server/fhir/r4/references";

type InternalAppointmentShape = Parameters<typeof mapInternalAppointmentToFhir>[0];
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

async function ensureAppointmentLink(clinicId: string, internalId: string) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: "APPOINTMENT",
    internalId,
    fhirId: internalId,
  });
}

async function ensurePatientLink(clinicId: string, internalPatient: { id: string; run: string }) {
  return FhirLinkService.ensureLink({
    clinicId,
    resourceType: "PATIENT",
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
      resourceType: "PATIENT",
      fhirId: patientFhirId,
    })) ?? patientFhirId
  );
}

export const GET = withFhirTransaction(
  {
    interaction: "Appointment.search",
    rateLimitScope: "/api/fhir/r4/Appointment",
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
            resourceType: "APPOINTMENT",
            fhirId: resourceId,
          })) ?? resourceId;
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
          return fhirJsonResponse(buildSearchSetBundle(origin, "Appointment", []), 200);
        }
        const resource = await toFhirAppointment(session.clinicId, item);
        return fhirJsonResponse(buildSearchSetBundle(origin, "Appointment", [{ resource }]), 200);
      }

      const patientRaw = searchParams.get("patient");
      const patientId = patientRaw
        ? await resolvePatientInternalId(session.clinicId, patientRaw)
        : null;

      const practitionerRaw = searchParams.get("practitioner");
      const practitionerId = parseFhirReferenceId(practitionerRaw, "Practitioner");

      const date = parseDate(searchParams.get("date"));
      const from = parseDate(searchParams.get("from")) ?? (date ? new Date(date) : null);
      const to =
        parseDate(searchParams.get("to")) ??
        (date
          ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
          : null);

      const statusRaw = searchParams.get("status");
      if (statusRaw && !ALLOWED_FHIR_APPOINTMENT_STATUSES.has(statusRaw)) {
        return fhirErrorResponse(400, "Appointment.status no valido para FHIR R4.", "invalid");
      }
      const status = statusRaw ? mapFhirAppointmentStatusToInternal(statusRaw as never) : null;

      const list = await AppointmentsService.list({
        clinicId: session.clinicId,
        from,
        to,
        doctorId: session.role === "DOCTOR" ? session.userId : practitionerId,
        patientId,
        status,
        q: searchParams.get("q"),
      });

      const resources = await Promise.all(
        list.map(async (item: InternalAppointmentShape) => ({
          resource: await toFhirAppointment(session.clinicId, item),
        }))
      );

      return fhirJsonResponse(buildSearchSetBundle(origin, "Appointment", resources), 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo buscar Appointment.";
      return fhirErrorResponse(mapErrorToHttpStatus(message), message);
    }
  }
);

export const POST = withFhirTransaction(
  {
    interaction: "Appointment.create",
    rateLimitScope: "/api/fhir/r4/Appointment",
  },
  async (req: Request) => {
    try {
      const session = await requireFhirClinicSession(req);
      requireRole(session.role, ["ADMIN", "SECRETARY"]);

      const body = (await req.json()) as FhirAppointment;
      if (body?.resourceType !== "Appointment") {
        return fhirErrorResponse(400, "El recurso debe ser Appointment.", "invalid");
      }

      const draft = mapFhirAppointmentToInternalDraft(body);
      const patientId = await resolvePatientInternalId(session.clinicId, draft.patientId);
      if (!patientId) {
        return fhirErrorResponse(400, "No se pudo resolver el paciente referenciado.", "invalid");
      }

      const input: AppointmentInput = {
        clinicId: session.clinicId,
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

      const item = await AppointmentsService.create(input);
      const resource = await toFhirAppointment(session.clinicId, item);

      const { origin } = new URL(req.url);
      return fhirJsonResponse(resource, 201, {
        Location: `${origin}/api/fhir/r4/Appointment/${resource.id}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear Appointment.";
      const lower = message.toLowerCase();
      const status = lower.includes("conflicto") || lower.includes("conflict") ? 409 : mapErrorToHttpStatus(message);
      return fhirErrorResponse(status, message);
    }
  }
);
