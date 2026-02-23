import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";
import { sendEmail } from "@/server/notifications/email";

const appointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  boxId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
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

    const item = await AppointmentsService.create({
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

    let notificationWarning: string | null = null;
    if (item.patient.email) {
      const patientName = [item.patient.firstName, item.patient.lastName, item.patient.secondLastName ?? ""]
        .join(" ")
        .trim();
      const doctorName = [item.doctor.profile?.firstName ?? "", item.doctor.profile?.lastName ?? ""]
        .join(" ")
        .trim() || item.doctor.email;

      const subject = "Cita agendada en ZENSYA";
      const text = [
        `Hola ${patientName || item.patient.firstName},`,
        "",
        "Tu cita fue agendada correctamente en ZENSYA.",
        `Fecha y hora: ${formatDateTime(item.startAt)}`,
        `Profesional: ${doctorName}`,
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

    return NextResponse.json({ ok: true, item, notificationWarning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la cita.";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("conflict") || lowerMessage.includes("conflicto") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
