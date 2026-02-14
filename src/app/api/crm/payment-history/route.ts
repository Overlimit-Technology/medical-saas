import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { CrmService } from "@/server/crm/CrmService";

const paymentCreateSchema = z.object({
  patientId: z.string().min(1),
  treatmentId: z.string().min(1),
  recordedAt: z.string().optional(),
  performedAt: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "WAIVED"]).optional(),
  amount: z.coerce.number().positive().optional(),
  notes: z.string().max(250).optional().nullable(),
});

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ ok: false, error: "patientId is required" }, { status: 400 });
    }

    const data = await CrmService.listPaymentHistory(session.clinicId, patientId);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment history";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = paymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const recordedAt = parsed.data.recordedAt ? parseDate(parsed.data.recordedAt) : new Date();
    if (!recordedAt) {
      return NextResponse.json({ ok: false, error: "Invalid recordedAt" }, { status: 400 });
    }

    const performedAt = parsed.data.performedAt ? parseDate(parsed.data.performedAt) : null;
    if (parsed.data.performedAt && !performedAt) {
      return NextResponse.json({ ok: false, error: "Invalid performedAt" }, { status: 400 });
    }

    const item = await CrmService.createPaymentEntry({
      clinicId: session.clinicId,
      patientId: parsed.data.patientId,
      treatmentId: parsed.data.treatmentId,
      recordedAt,
      performedAt,
      status: parsed.data.status,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment history";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
