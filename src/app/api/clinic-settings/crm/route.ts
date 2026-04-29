import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  whatsappPhoneNumberId: z.string().max(100).optional().nullable(),
  whatsappBusinessAccountId: z.string().max(100).optional().nullable(),
  whatsappAccessToken: z.string().max(500).optional().nullable(),
  instagramUrl: z.string().max(250).optional().nullable(),
  facebookUrl: z.string().max(250).optional().nullable(),
  tiktokUrl: z.string().max(250).optional().nullable(),
  websiteUrl: z.string().max(250).optional().nullable(),
});

const SELECT = {
  whatsappPhoneNumberId: true,
  whatsappBusinessAccountId: true,
  whatsappAccessToken: true,
  instagramUrl: true,
  facebookUrl: true,
  tiktokUrl: true,
  websiteUrl: true,
} as const;

export async function GET() {
  try {
    const session = await requireClinicSession();
    const row = await prisma.clinicSettings.findUnique({
      where: { clinicId: session.clinicId },
      select: SELECT,
    });

    return NextResponse.json({ ok: true, item: row ?? {} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar configuracion CRM.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"]);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos invalidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const row = await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId, ...parsed.data },
      update: parsed.data,
      select: SELECT,
    });

    return NextResponse.json({ ok: true, item: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuracion CRM.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
