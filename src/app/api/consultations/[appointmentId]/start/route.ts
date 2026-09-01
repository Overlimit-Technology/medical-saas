import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";

// POST /api/consultations/:appointmentId/start -> abre el encuentro clinico.
// Es idempotente: volver a entrar a una consulta abierta devuelve la misma.
export async function POST(
  _req: Request,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const item = await ConsultationsService.start({
      clinicId: session.clinicId,
      appointmentId: params.appointmentId,
      doctorId: session.userId,
      authorId: session.userId,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar la consulta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
