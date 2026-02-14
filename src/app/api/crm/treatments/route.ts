import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { CrmService } from "@/server/crm/CrmService";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const items = await CrmService.listTreatments();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load treatments";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
