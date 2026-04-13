import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { SeguimientoService } from "@/server/seguimiento/SeguimientoService";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "TREATMENTS");

    const [items, stats] = await Promise.all([
      SeguimientoService.list(session.clinicId),
      SeguimientoService.stats(session.clinicId),
    ]);

    return NextResponse.json({ ok: true, items, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load seguimiento";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
