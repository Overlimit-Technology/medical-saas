import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    if (!Array.isArray(body.orderedIds)) {
      return NextResponse.json({ ok: false, error: "orderedIds es obligatorio." }, { status: 400 });
    }
    await LeadsCrmService.reorderColumns(session.clinicId, body.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al reordenar columnas.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
