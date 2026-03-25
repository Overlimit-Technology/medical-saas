import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ClinicalRecordsService } from "@/server/clinical-records/ClinicalRecordsService";

const createSchema = z.object({
  appointmentId: z.string().min(1),
  templateId: z.string().min(1),
  patientId: z.string().min(1),
  values: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.string(),
    })
  ),
});

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get("appointmentId");
    if (!appointmentId) {
      return NextResponse.json({ ok: false, error: "appointmentId requerido." }, { status: 400 });
    }

    const items = await ClinicalRecordsService.listByAppointment(session.clinicId, appointmentId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar fichas.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const item = await ClinicalRecordsService.create(session.clinicId, session.userId, parsed.data);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear ficha.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
