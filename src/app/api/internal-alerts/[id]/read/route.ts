import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const ok = await InternalAlertsService.markAsRead(params.id, session.userId);

    if (!ok) {
      return NextResponse.json({ ok: false, error: "Alerta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo marcar la alerta como leida.";
    return NextResponse.json({ ok: false, error: message }, { status: mapErrorToHttpStatus(message) });
  }
}
