import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { getSharedConfig } from "@/server/auth/sharedDevice";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  idleMinutes: z.number().int().min(2).max(60).optional(),
  maxHours: z.number().int().min(1).max(12).optional(),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    return NextResponse.json({ ok: true, ...(await getSharedConfig(session.clinicId)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la configuracion.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const data = {
      ...(parsed.data.enabled !== undefined ? { sharedSessionsEnabled: parsed.data.enabled } : {}),
      ...(parsed.data.idleMinutes !== undefined ? { sharedIdleLockMinutes: parsed.data.idleMinutes } : {}),
      ...(parsed.data.maxHours !== undefined ? { sharedMaxHoursWithoutPassword: parsed.data.maxHours } : {}),
    };

    await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId, ...data },
      update: data,
    });

    const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    await AuditService.log(
      "SESION_COMPARTIDA_CONFIG",
      admin?.email ?? session.userId,
      `Sede ${session.clinicId}: ${JSON.stringify(parsed.data)}`
    );

    return NextResponse.json({ ok: true, ...(await getSharedConfig(session.clinicId)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la configuracion.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
