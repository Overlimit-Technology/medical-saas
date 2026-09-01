import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";
import { consultationDraftSchema } from "@/server/consultations/consultationSchemas";

/** Un doctor solo entra a sus propias citas; admin y secretaria ven las de la sede. */
function scopeFor(session: { role: string; userId: string; clinicId: string }) {
  return {
    clinicId: session.clinicId,
    doctorId: session.role === "DOCTOR" ? session.userId : null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["AGENDA", "CLINICAL_VISITS"]);

    const item = await ConsultationsService.bootstrap({
      ...scopeFor(session),
      appointmentId: params.appointmentId,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la consulta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const parsed = consultationDraftSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Borrador invalido." }, { status: 400 });
    }

    const item = await ConsultationsService.saveDraft({
      ...scopeFor(session),
      appointmentId: params.appointmentId,
      doctorId: session.userId,
      draft: parsed.data,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el avance.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
