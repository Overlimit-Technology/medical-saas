import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function GET() {
  try {
    const session = await requireClinicSession();
    const data = await LeadsCrmService.getFullPipeline(session.clinicId);
    return NextResponse.json({ ok: true, ...data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al cargar pipeline.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
