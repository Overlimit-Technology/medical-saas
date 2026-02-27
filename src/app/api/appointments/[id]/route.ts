import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService, type AppointmentInput } from "@/server/appointments/AppointmentsService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/notifications/email";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";

const appointmentUpdateSchema = z.object({
  patientId: z.string().min(1).optional(),
  doctorId: z.string().min(1).optional(),
  boxId: z.string().min(1).optional(),
  startAt: z.string().min(1).optional(),
  endAt: z.string().min(1).optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const appointmentCancelSchema = z.object({
  reason: z.string().trim().min(1).max(250),
  cancelledBy: z.enum(["PATIENT", "STAFF"]).optional(),
});

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

// GET /api/appointments/:id -> detalle; si es doctor, solo sus citas.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const item = await prisma.appointment.findFirst({
      where: {
        id: params.id,
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
      return NextResponse.json({ ok: false, error: "Cita no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo cargar la cita." }, { status: 400 });
  }
}

// PATCH /api/appointments/:id -> actualiza.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const startAt = parsed.data.startAt ? parseDate(parsed.data.startAt) : undefined;
    const endAt = parsed.data.endAt ? parseDate(parsed.data.endAt) : undefined;
    if ((parsed.data.startAt && !startAt) || (parsed.data.endAt && !endAt)) {
      return NextResponse.json({ ok: false, error: "Rango de horario invalido." }, { status: 400 });
    }

    const data: Partial<AppointmentInput> = {
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      boxId: parsed.data.boxId,
      startAt: startAt ?? undefined,
      endAt: endAt ?? undefined,
      status: parsed.data.status,
      paymentStatus: parsed.data.paymentStatus,
      notes: parsed.data.notes,
    };

    const previous = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId: session.clinicId },
      select: { startAt: true, endAt: true, status: true },
    });

    let item: Awaited<ReturnType<typeof AppointmentsService.update>>;
    try {
      item = await AppointmentsService.update(params.id, session.clinicId, {
        ...data,
        createdBy: session.userId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la cita.";
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("conflict") || lowerMessage.includes("conflicto")) {
        const rangeLabel =
          startAt && endAt
            ? `${formatDateTime(startAt)} - ${formatDateTime(endAt)}`
            : "Rango no especificado";

        try {
          await InternalAlertsService.createAndDispatch({
            origin: new URL(req.url).origin,
            clinicId: session.clinicId,
            actorUserId: session.userId,
            actorRole: session.role,
            doctorId: parsed.data.doctorId ?? undefined,
            eventType: "APPOINTMENT_CONFLICT",
            title: "Conflicto de agenda detectado",
            message: `Se detecto conflicto al actualizar la cita ${params.id}. Rango: ${rangeLabel}.`,
            referenceType: "APPOINTMENT",
            referenceId: params.id,
          });
        } catch {
          // No interrumpir el flujo si falla la alerta interna.
        }
      }
      throw error;
    }

    const patientName = [item.patient.firstName, item.patient.lastName, item.patient.secondLastName ?? ""]
      .join(" ")
      .trim();
    const doctorName = [item.doctor.profile?.firstName ?? "", item.doctor.profile?.lastName ?? ""]
      .join(" ")
      .trim() || item.doctor.email;
    const notifyRolesForStaffAction =
      session.role === "SECRETARY"
        ? (["ADMIN", "DOCTOR"] as const)
        : (["ADMIN", "SECRETARY", "DOCTOR"] as const);
    const includeActorInInternalAlert = session.role === "ADMIN";

    let notificationWarning: string | null = null;
    const wasRescheduled = previous
      ? previous.startAt.getTime() !== item.startAt.getTime() ||
        previous.endAt.getTime() !== item.endAt.getTime()
      : Boolean(parsed.data.startAt || parsed.data.endAt);
    const becameNoShow = previous ? previous.status !== "NO_SHOW" && item.status === "NO_SHOW" : item.status === "NO_SHOW";

    if (wasRescheduled && item.patient.email) {
      const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
      const subject = "Tu cita fue reagendada en ZENSYA";
      const text = [
        `Hola ${patientName || item.patient.firstName},`,
        "",
        "Tu cita fue actualizada en ZENSYA.",
        `Nueva fecha y hora: ${formatDateTime(item.startAt)}`,
        `Profesional: ${doctorName}`,
        `Sede: ${clinicLabel}`,
        "",
        "Si tienes dudas, contacta a la clinica.",
      ].join("\n");

      const origin = new URL(req.url).origin;
      const sent = await sendEmail({
        origin,
        to: item.patient.email,
        subject,
        text,
      });
      if (!sent.ok) {
        notificationWarning = sent.error;
      }
    }

    let internalAlertWarning: string | null = null;
    const internalAlertWarnings: string[] = [];

    if (wasRescheduled) {
      try {
        const alert = await InternalAlertsService.createAndDispatch({
          origin: new URL(req.url).origin,
          clinicId: session.clinicId,
          actorUserId: session.userId,
          actorRole: session.role,
          doctorId: item.doctorId,
          eventType: "APPOINTMENT_RESCHEDULED",
          title: "Cita reagendada",
          message: `Paciente: ${patientName || item.patient.firstName}. Doctor: ${doctorName}. Nueva fecha: ${formatDateTime(item.startAt)}.`,
          referenceType: "APPOINTMENT",
          referenceId: item.id,
          targetRoles: [...notifyRolesForStaffAction],
          includeActor: includeActorInInternalAlert,
        });
        if (alert.warning) internalAlertWarnings.push(alert.warning);
      } catch (error) {
        internalAlertWarnings.push(
          error instanceof Error ? error.message : "No se pudo generar la alerta interna de reagendamiento."
        );
      }
    }

    if (becameNoShow) {
      try {
        const alert = await InternalAlertsService.createAndDispatch({
          origin: new URL(req.url).origin,
          clinicId: session.clinicId,
          actorUserId: session.userId,
          actorRole: session.role,
          doctorId: item.doctorId,
          eventType: "CUSTOM",
          title: "Paciente ausente (No show)",
          message: `Paciente: ${patientName || item.patient.firstName}. Doctor: ${doctorName}. Fecha: ${formatDateTime(item.startAt)}.`,
          referenceType: "APPOINTMENT",
          referenceId: item.id,
          targetRoles: [...notifyRolesForStaffAction],
          includeActor: includeActorInInternalAlert,
        });
        if (alert.warning) internalAlertWarnings.push(alert.warning);
      } catch (error) {
        internalAlertWarnings.push(
          error instanceof Error ? error.message : "No se pudo generar la alerta interna de ausencia."
        );
      }
    }

    if (internalAlertWarnings.length > 0) {
      internalAlertWarning = internalAlertWarnings.join(" | ");
    }

    return NextResponse.json({ ok: true, item, notificationWarning, internalAlertWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la cita.";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("conflict") || lowerMessage.includes("conflicto") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

// DELETE /api/appointments/:id -> cancela cita.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json().catch(() => ({}));
    const parsed = appointmentCancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Debes ingresar un motivo de cancelacion (maximo 250 caracteres)." },
        { status: 400 }
      );
    }
    const reason = parsed.data.reason;
    const cancelledBy = parsed.data.cancelledBy ?? "STAFF";

    const item = await AppointmentsService.cancel(params.id, session.clinicId, session.userId, reason);
    let notificationWarning: string | null = null;

    if (item.patient.email && cancelledBy !== "PATIENT") {
      const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
      const patientName = [item.patient.firstName, item.patient.lastName, item.patient.secondLastName ?? ""]
        .join(" ")
        .trim();
      const doctorName = [item.doctor.profile?.firstName ?? "", item.doctor.profile?.lastName ?? ""]
        .join(" ")
        .trim() || item.doctor.email;

      const lines = [
        `Hola ${patientName || item.patient.firstName},`,
        "",
        "Tu cita fue cancelada en ZENSYA.",
        `Fecha y hora cancelada: ${formatDateTime(item.startAt)}`,
        `Profesional: ${doctorName}`,
        `Sede: ${clinicLabel}`,
        `Motivo: ${reason}`,
      ];
      lines.push("", "Si necesitas reagendar, contacta a la clinica.");

      const origin = new URL(req.url).origin;
      const sent = await sendEmail({
        origin,
        to: item.patient.email,
        subject: "Tu cita fue cancelada en ZENSYA",
        text: lines.join("\n"),
      });
      if (!sent.ok) {
        notificationWarning = sent.error;
      }
    }

    const patientName = [item.patient.firstName, item.patient.lastName, item.patient.secondLastName ?? ""]
      .join(" ")
      .trim();
    const doctorName = [item.doctor.profile?.firstName ?? "", item.doctor.profile?.lastName ?? ""]
      .join(" ")
      .trim() || item.doctor.email;
    const internalTargetRoles =
      cancelledBy === "PATIENT"
        ? (["ADMIN", "SECRETARY", "DOCTOR"] as const)
        : session.role === "SECRETARY"
          ? (["ADMIN", "DOCTOR"] as const)
          : (["ADMIN", "SECRETARY", "DOCTOR"] as const);
    const includeActorInInternalAlert = session.role === "ADMIN" && internalTargetRoles.includes("ADMIN");
    const cancelledByLabel =
      cancelledBy === "PATIENT" ? "Paciente" : session.role === "SECRETARY" ? "Secretaria" : "Administrador";

    let internalAlertWarning: string | null = null;
    try {
      const alert = await InternalAlertsService.createAndDispatch({
        origin: new URL(req.url).origin,
        clinicId: session.clinicId,
        actorUserId: session.userId,
        actorRole: session.role,
        doctorId: item.doctorId,
        eventType: "APPOINTMENT_CANCELLED",
        title: "Cita cancelada",
        message: `Paciente: ${patientName || item.patient.firstName}. Doctor: ${doctorName}. Fecha cancelada: ${formatDateTime(item.startAt)}. Cancelada por: ${cancelledByLabel}. Motivo: ${reason}.`,
        referenceType: "APPOINTMENT",
        referenceId: item.id,
        targetRoles: [...internalTargetRoles],
        includeActor: includeActorInInternalAlert,
      });
      internalAlertWarning = alert.warning;
    } catch (error) {
      internalAlertWarning = error instanceof Error ? error.message : "No se pudo generar la alerta interna.";
    }

    return NextResponse.json({ ok: true, item, notificationWarning, internalAlertWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar la cita.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
