import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ClinicalVisitsService } from "@/server/clinical-visits/ClinicalVisitsService";

const createSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().min(1).optional().nullable(),
  startedAt: z.string().optional(),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    const items = await ClinicalVisitsService.list({
      clinicId: session.clinicId,
      doctorId: session.userId,
      patientId: patientId ?? undefined,
      from,
      to,
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load clinical visits" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const startedAt = parseDate(parsed.data.startedAt);
    if (parsed.data.startedAt && !startedAt) {
      return NextResponse.json({ ok: false, error: "Invalid start date" }, { status: 400 });
    }

    const item = await ClinicalVisitsService.create({
      clinicId: session.clinicId,
      doctorId: session.userId,
      patientId: parsed.data.patientId,
      appointmentId: parsed.data.appointmentId ?? null,
      startedAt: startedAt ?? undefined,
      authorId: session.userId,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start clinical visit";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
