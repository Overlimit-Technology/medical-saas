import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";
import { EMAIL_TEMPLATE_TYPES } from "@/domain/clinic-settings/entities/EmailTemplate";

const saveSchema = z.object({
  eventType: z.enum(EMAIL_TEMPLATE_TYPES),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(5000),
  enabled: z.boolean(),
});

const SELECT = {
  id: true,
  eventType: true,
  subject: true,
  body: true,
  enabled: true,
} as const;

export async function GET() {
  try {
    const session = await requireClinicSession();

    const settings = await prisma.clinicSettings.findUnique({
      where: { clinicId: session.clinicId },
      select: { id: true },
    });

    if (!settings) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const items = await prisma.emailTemplate.findMany({
      where: { clinicSettingsId: settings.id },
      select: SELECT,
      orderBy: { eventType: "asc" },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar plantillas de email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"]);

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos invalidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const settings = await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId },
      update: {},
      select: { id: true },
    });

    const item = await prisma.emailTemplate.upsert({
      where: {
        clinicSettingsId_eventType: {
          clinicSettingsId: settings.id,
          eventType: parsed.data.eventType,
        },
      },
      create: {
        clinicSettingsId: settings.id,
        eventType: parsed.data.eventType,
        subject: parsed.data.subject,
        body: parsed.data.body,
        enabled: parsed.data.enabled,
      },
      update: {
        subject: parsed.data.subject,
        body: parsed.data.body,
        enabled: parsed.data.enabled,
      },
      select: SELECT,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar plantilla de email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
