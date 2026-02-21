import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { TreatmentsService } from "@/server/treatments/TreatmentsService";

const updateTreatmentSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().min(0),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const body = await req.json();
    const parsed = updateTreatmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await TreatmentsService.update(params.id, parsed.data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update treatment";
    const status = message.includes("no encontrado") ? 404 : message.includes("existe") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
