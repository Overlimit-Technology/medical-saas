import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ProfessionsService } from "@/server/professions/ProfessionsService";

const createSchema = z.object({ name: z.string().trim().min(2).max(60) });

export async function GET() {
  try {
    const session = await requireClinicSession();
    const items = await ProfessionsService.list(session.clinicId);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las profesiones." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "El nombre de la profesion no es valido." }, { status: 400 });
    }
    const item = await ProfessionsService.createForClinic(session.clinicId, parsed.data.name);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la profesion.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "Acceso denegado." ? 403 : 400 });
  }
}
