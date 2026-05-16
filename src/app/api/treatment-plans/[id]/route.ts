import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { TreatmentPlansService } from "@/server/treatment-plans/TreatmentPlansService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["AGENDA", "CLINICAL_VISITS"]);

    const item = await TreatmentPlansService.getById({
      clinicId: session.clinicId,
      id: params.id,
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Plan de tratamiento no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el plan de tratamiento.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
