import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const ok = await InternalAlertsService.markAsRead(params.id, session.userId);

    if (!ok) {
      return NextResponse.json({ ok: false, error: "Alerta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo marcar la alerta como leida." }, { status: 400 });
  }
}
