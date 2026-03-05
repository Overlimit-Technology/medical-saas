import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { sendEmail } from "@/server/notifications/email";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";
import { PatientsService } from "@/server/patients/PatientsService";

const appointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  boxId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  patientFirstName: z.string().min(1).optional(),
  patientLastName: z.string().min(1).optional(),
  patientEmail: z.string().email().optional().nullable(),
  patientPhone: z.string().optional().nullable(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
});

function parseDate(value: string | null) {
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

// Lista citas de la clínica; si es doctor, las filtra al usuario autenticado.
export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    const { searchParams } = new URL(req.url);

    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const data = await AppointmentsService.list({
      clinicId: session.clinicId,
      from,
      to,
      doctorId: session.role === "DOCTOR" ? session.userId : doctorId,
      patientId,
      status,
      q,
    });

    return NextResponse.json({ ok: true, items: data });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las citas." }, { status: 400 });
  }
}

// Crea una cita. Admin/Secretaria pueden asignar cualquier doctor.
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = appointmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const startAt = parseDate(parsed.data.startAt);
    const endAt = parseDate(parsed.data.endAt);
    if (!startAt || !endAt || endAt <= startAt) {
      return NextResponse.json({ ok: false, error: "Rango de horario invalido." }, { status: 400 });
    }

    const patientFirstName = parsed.data.patientFirstName?.trim();
    const patientLastName = parsed.data.patientLastName?.trim();
    const patientEmail =
      typeof parsed.data.patientEmail === "string" ? parsed.data.patientEmail.trim() || null : parsed.data.patientEmail;
    const patientPhone =
      typeof parsed.data.patientPhone === "string" ? parsed.data.patientPhone.trim() || null : parsed.data.patientPhone;

    if ((parsed.data.patientFirstName !== undefined && !patientFirstName) ||
        (parsed.data.patientLastName !== undefined && !patientLastName)) {
      return NextResponse.json(
        { ok: false, error: "Nombre y apellido del paciente son obligatorios." },
        { status: 400 }
      );
    }

    if (
      parsed.data.patientFirstName !== undefined ||
      parsed.data.patientLastName !== undefined ||
      parsed.data.patientEmail !== undefined ||
      parsed.data.patientPhone !== undefined
    ) {
      await PatientsService.update(parsed.data.patientId, session.clinicId, {
        firstName: patientFirstName,
        lastName: patientLastName,
        email: patientEmail,
        phone: patientPhone,
      });
    }

    let item: Awaited<ReturnType<typeof AppointmentsService.create>>;
    try {
      item = await AppointmentsService.create({
        clinicId: session.clinicId,
        patientId: parsed.data.patientId,
        doctorId: parsed.data.doctorId,
        boxId: parsed.data.boxId,
        startAt,
        endAt,
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
        notes: parsed.data.notes,
        createdBy: session.userId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la cita.";
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("conflict") || lowerMessage.includes("conflicto")) {
        try {
          await InternalAlertsService.createAndDispatch({
            origin: new URL(req.url).origin,
            clinicId: session.clinicId,
            actorUserId: session.userId,
            actorRole: session.role,
            doctorId: parsed.data.doctorId,
            eventType: "APPOINTMENT_CONFLICT",
            title: "Conflicto de agenda detectado",
            message: `Se detecto conflicto al crear una cita. PacienteId: ${parsed.data.patientId}. DoctorId: ${parsed.data.doctorId}. Rango: ${formatDateTime(startAt)} - ${formatDateTime(endAt)}.`,
            referenceType: "APPOINTMENT",
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

    let notificationWarning: string | null = null;
    if (item.patient.email) {
      const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
      const subject = "Cita agendada en ZENSYA";
      const text = [
        `Hola ${patientName || item.patient.firstName},`,
        "",
        "Tu cita fue agendada correctamente en ZENSYA.",
        `Fecha y hora: ${formatDateTime(item.startAt)}`,
        `Profesional: ${doctorName}`,
        `Sede: ${clinicLabel}`,
        "",
        "Si necesitas reagendar, responde a este correo o contacta a la clinica.",
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
    try {
      const alert = await InternalAlertsService.createAndDispatch({
        origin: new URL(req.url).origin,
        clinicId: session.clinicId,
        actorUserId: session.userId,
        actorRole: session.role,
        doctorId: item.doctorId,
        eventType: "APPOINTMENT_CREATED",
        title: "Nueva cita agendada",
        message: `Paciente: ${patientName || item.patient.firstName}. Doctor: ${doctorName}. Fecha: ${formatDateTime(item.startAt)}.`,
        referenceType: "APPOINTMENT",
        referenceId: item.id,
      });
      internalAlertWarning = alert.warning;
    } catch (error) {
      internalAlertWarning = error instanceof Error ? error.message : "No se pudo generar la alerta interna.";
    }

    return NextResponse.json({ ok: true, item, notificationWarning, internalAlertWarning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la cita.";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("conflict") || lowerMessage.includes("conflicto") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
