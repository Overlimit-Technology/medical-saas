import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";
import { prisma } from "@/lib/prisma";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

/**
 * Sala de espera de recepcion.
 *
 * Persiste el estado de llegada de una cita y, opcionalmente, avisa al
 * profesional que la atiende. El estado se deriva de los campos guardados:
 *   arrivedAt != null    -> en sala
 *   delayMinutes != null -> con demora
 *   ninguno              -> en espera
 */
const arrivalSchema = z.object({
  status: z.enum(["WAITING", "ARRIVED", "DELAYED"]),
  delayMinutes: z.number().int().min(1).max(240).optional(),
  notify: z.boolean().optional(),
});

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const parsed = arrivalSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos de llegada invalidos." },
        { status: 400 }
      );
    }

    const { status, delayMinutes, notify } = parsed.data;
    if (status === "DELAYED" && !delayMinutes) {
      return NextResponse.json(
        { ok: false, error: "Indica los minutos de demora." },
        { status: 400 }
      );
    }

    // El scope por sede es obligatorio: sin el, una recepcionista podria tocar
    // citas de otra clinica pasando un id ajeno.
    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId: session.clinicId },
      select: {
        id: true,
        doctorId: true,
        startAt: true,
        arrivedAt: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { profile: { select: { firstName: true, lastName: true } } } },
        box: { select: { name: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ ok: false, error: "Cita no encontrada." }, { status: 404 });
    }

    const now = new Date();
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        // Se conserva la hora de llegada original: reenviar un aviso no debe
        // reiniciar cuanto lleva el paciente esperando.
        arrivedAt: status === "ARRIVED" ? (appointment.arrivedAt ?? now) : null,
        delayMinutes: status === "DELAYED" ? (delayMinutes ?? null) : null,
        // Al cambiar de estado el aviso anterior deja de ser valido.
        arrivalNotifiedAt: notify ? now : null,
      },
      select: { id: true, arrivedAt: true, delayMinutes: true, arrivalNotifiedAt: true },
    });

    let internalAlertWarning: string | null = null;

    if (notify) {
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
      const message =
        status === "DELAYED"
          ? `${patientName} llegara con ${delayMinutes} min de retraso a la cita de ${formatTime(appointment.startAt)} (${appointment.box.name}).`
          : status === "ARRIVED"
            ? `${patientName} ya esta en sala para la cita de ${formatTime(appointment.startAt)} (${appointment.box.name}).`
            : `${patientName} espera en recepcion para la cita de ${formatTime(appointment.startAt)} (${appointment.box.name}).`;

      try {
        const alert = await InternalAlertsService.createAndDispatch({
          origin: new URL(req.url).origin,
          clinicId: session.clinicId,
          actorUserId: session.userId,
          actorRole: session.role,
          doctorId: appointment.doctorId,
          eventType: "PATIENT_ARRIVED",
          title: status === "DELAYED" ? "Paciente con demora" : "Paciente en sala",
          message,
          referenceType: "APPOINTMENT",
          referenceId: appointment.id,
          // Solo al profesional que atiende: no se satura al resto del equipo.
          targetRoles: ["DOCTOR"],
          dispatchEmail: false,
        });
        internalAlertWarning = alert.warning ?? null;
      } catch (error) {
        internalAlertWarning =
          error instanceof Error ? error.message : "No se pudo avisar al profesional.";
      }
    }

    return NextResponse.json({ ok: true, item: updated, internalAlertWarning });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, error: message }, { status: mapErrorToHttpStatus(message) });
  }
}
