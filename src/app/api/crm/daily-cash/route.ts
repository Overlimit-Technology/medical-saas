import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { CrmService } from "@/server/crm/CrmService";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["SECRETARY"]);

    const { searchParams } = new URL(req.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Rango diario invalido." }, { status: 400 });
    }

    const data = await CrmService.getDailyCashSummary(session.clinicId, from, to);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la caja del dia.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
