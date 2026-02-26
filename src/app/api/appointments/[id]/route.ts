import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService, type AppointmentInput } from "@/server/appointments/AppointmentsService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/notifications/email";

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
      select: { startAt: true, endAt: true },
    });

    const item = await AppointmentsService.update(params.id, session.clinicId, {
      ...data,
      createdBy: session.userId,
    });

    let notificationWarning: string | null = null;
    const wasRescheduled = previous
      ? previous.startAt.getTime() !== item.startAt.getTime() ||
        previous.endAt.getTime() !== item.endAt.getTime()
      : Boolean(parsed.data.startAt || parsed.data.endAt);

    if (wasRescheduled && item.patient.email) {
      const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
      const patientName = [item.patient.firstName, item.patient.lastName, item.patient.secondLastName ?? ""]
        .join(" ")
        .trim();
      const doctorName = [item.doctor.profile?.firstName ?? "", item.doctor.profile?.lastName ?? ""]
        .join(" ")
        .trim() || item.doctor.email;

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

    return NextResponse.json({ ok: true, item, notificationWarning });
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

    const body = await req.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    const item = await AppointmentsService.cancel(params.id, session.clinicId, session.userId, reason);
    let notificationWarning: string | null = null;

    if (item.patient.email) {
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
      ];
      if (reason?.trim()) {
        lines.push(`Motivo: ${reason.trim()}`);
      }
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

    return NextResponse.json({ ok: true, item, notificationWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar la cita.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
