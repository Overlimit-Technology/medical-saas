import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AttentionTypesService, attentionTypeInputSchema } from "@/server/clinical/AttentionTypesService";
import { clinicalError } from "@/server/clinical/clinicalRoute";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR", "ADMIN"]);
    const parsed = attentionTypeInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." }, { status: 400 });
    }
    const item = await AttentionTypesService.update({
      clinicId: session.clinicId,
      userId: session.userId,
      isAdmin: session.role === "ADMIN",
      id: params.id,
      input: parsed.data,
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return clinicalError(error, "No se pudo guardar el tipo de atencion.");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR", "ADMIN"]);
    await AttentionTypesService.archive({ clinicId: session.clinicId, userId: session.userId, isAdmin: session.role === "ADMIN", id: params.id });
    return NextResponse.json({ ok: true, item: null });
  } catch (error) {
    return clinicalError(error, "No se pudo eliminar el tipo de atencion.");
  }
}
