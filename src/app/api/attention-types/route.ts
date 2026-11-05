import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AttentionTypesService, attentionTypeInputSchema } from "@/server/clinical/AttentionTypesService";
import { clinicalError } from "@/server/clinical/clinicalRoute";

// GET /api/attention-types            -> tarjetas del profesional en sesion.
// GET /api/attention-types?doctorId=  -> tarjetas de otro profesional de la sede (recepcion, al agendar).
export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    const doctorId = new URL(req.url).searchParams.get("doctorId");
    let userId = session.userId;
    if (doctorId && doctorId !== session.userId) {
      requireRole(session, ["ADMIN", "SECRETARY"], ["AGENDA"]);
      const member = await prisma.clinicMembership.findFirst({ where: { clinicId: session.clinicId, userId: doctorId }, select: { id: true } });
      if (!member) return NextResponse.json({ ok: false, error: "Profesional no encontrado." }, { status: 404 });
      userId = doctorId;
    }
    const item = await AttentionTypesService.listFor({ clinicId: session.clinicId, userId });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return clinicalError(error, "No se pudieron cargar los tipos de atencion.");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR", "ADMIN"]);
    const parsed = attentionTypeInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." }, { status: 400 });
    }
    const item = await AttentionTypesService.create({
      clinicId: session.clinicId,
      userId: session.userId,
      isAdmin: session.role === "ADMIN",
      input: parsed.data,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return clinicalError(error, "No se pudo crear el tipo de atencion.");
  }
}

const prefsSchema = z.object({
  prefs: z.array(z.object({ key: z.string().min(1).max(80), hidden: z.boolean(), position: z.number().int().min(0).max(10000) })).max(100),
});

// PUT /api/attention-types -> orden y visibilidad de las tarjetas del profesional.
export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    const parsed = prefsSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    await AttentionTypesService.savePrefs(session.userId, parsed.data.prefs);
    return NextResponse.json({ ok: true, item: null });
  } catch (error) {
    return clinicalError(error, "No se pudo guardar el orden.");
  }
}
