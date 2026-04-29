import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "AGENDA");

    await AppointmentsService.hardDelete(params.id, session.clinicId, session.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la cita.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
