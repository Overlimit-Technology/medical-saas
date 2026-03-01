import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { TreatmentsService } from "@/server/treatments/TreatmentsService";

const createTreatmentSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().min(0),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const items = await TreatmentsService.list();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load treatments";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const body = await req.json();
    const parsed = createTreatmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await TreatmentsService.create(parsed.data);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create treatment";
    const status = message.includes("existe") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
