import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";

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
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load appointments" }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const startAt = parseDate(parsed.data.startAt);
    const endAt = parseDate(parsed.data.endAt);
    if (!startAt || !endAt || endAt <= startAt) {
      return NextResponse.json({ ok: false, error: "Invalid time range" }, { status: 400 });
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

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create appointment";
    const status = message.includes("conflict") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
