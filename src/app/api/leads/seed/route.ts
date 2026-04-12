import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    if (session.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Solo administradores pueden ejecutar seed." }, { status: 403 });
    }
    const body = await req.json();
    const result = await LeadsCrmService.seed(session.clinicId, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al ejecutar seed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
