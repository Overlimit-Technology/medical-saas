import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { TreatmentPlansService } from "@/server/treatment-plans/TreatmentPlansService";
import { PatientsService } from "@/server/patients/PatientsService";

const createTreatmentPlanSchema = z.object({
  patientId: z.string().min(1),
  patientFirstName: z.string().min(1).optional(),
  patientLastName: z.string().min(1).optional(),
  patientEmail: z.string().email().optional().nullable(),
  patientPhone: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(600).optional().nullable(),
  treatmentIds: z.array(z.string().min(1)).min(1),
  doctorId: z.string().min(1),
  boxId: z.string().min(1),
  firstSessionStartAt: z.string().min(1),
  firstSessionEndAt: z.string().min(1),
  totalSessions: z.coerce.number().int().min(1).max(90),
  frequencyDays: z.coerce.number().int().min(1).max(60),
  appointmentNotes: z.string().trim().max(250).optional().nullable(),
  appointmentStatus: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
});

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["AGENDA", "CLINICAL_VISITS"]);

    const { searchParams } = new URL(req.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const items = await TreatmentPlansService.list({
      clinicId: session.clinicId,
      from,
      to,
      patientId,
      status,
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los planes de tratamiento.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "AGENDA");

    const body = await req.json();
    const parsed = createTreatmentPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos para crear el plan." }, { status: 400 });
    }

    const firstSessionStartAt = parseDate(parsed.data.firstSessionStartAt);
    const firstSessionEndAt = parseDate(parsed.data.firstSessionEndAt);
    if (!firstSessionStartAt || !firstSessionEndAt || firstSessionEndAt <= firstSessionStartAt) {
      return NextResponse.json({ ok: false, error: "Rango de horario invalido para la primera sesion." }, { status: 400 });
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

    const item = await TreatmentPlansService.createContinuous({
      clinicId: session.clinicId,
      patientId: parsed.data.patientId,
      createdBy: session.userId,
      name: parsed.data.name,
      notes: parsed.data.notes,
      treatmentIds: parsed.data.treatmentIds,
      doctorId: parsed.data.doctorId,
      boxId: parsed.data.boxId,
      firstSessionStartAt,
      firstSessionEndAt,
      totalSessions: parsed.data.totalSessions,
      frequencyDays: parsed.data.frequencyDays,
      appointmentNotes: parsed.data.appointmentNotes,
      appointmentStatus: parsed.data.appointmentStatus,
      paymentStatus: parsed.data.paymentStatus,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el plan de tratamiento.";
    const lower = message.toLowerCase();
    const status = lower.includes("conflicto") || lower.includes("conflict") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
