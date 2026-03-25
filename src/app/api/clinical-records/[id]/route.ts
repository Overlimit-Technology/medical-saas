import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ClinicalRecordsService } from "@/server/clinical-records/ClinicalRecordsService";

const updateSchema = z.object({
  values: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.string(),
    })
  ),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const item = await ClinicalRecordsService.getById(params.id, session.clinicId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar ficha.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const item = await ClinicalRecordsService.update(params.id, session.clinicId, session.userId, parsed.data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar ficha.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
