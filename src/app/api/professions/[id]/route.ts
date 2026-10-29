import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ProfessionsService } from "@/server/professions/ProfessionsService";

const updateSchema = z.object({ name: z.string().trim().min(2).max(60) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "El nombre de la profesion no es valido." }, { status: 400 });
    }
    const item = await ProfessionsService.rename(session.clinicId, params.id, parsed.data.name);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la profesion.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "Acceso denegado." ? 403 : message.includes("Ya existe") ? 409 : message.includes("no encontrada") ? 404 : 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    await ProfessionsService.remove(session.clinicId, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la profesion.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "Acceso denegado." ? 403 : message.includes("no encontrada") ? 404 : 400 });
  }
}
