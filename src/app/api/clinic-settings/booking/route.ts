import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { newBookingKey } from "@/server/booking/BookingService";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  slotMinutes: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  regenerateKey: z.boolean().optional(),
});

async function readSettings(clinicId: string, origin: string) {
  const settings = await prisma.clinicSettings.findUnique({
    where: { clinicId },
    select: { bookingEnabled: true, bookingSlotMinutes: true, bookingKey: true },
  });

  return {
    enabled: settings?.bookingEnabled ?? false,
    slotMinutes: settings?.bookingSlotMinutes ?? 30,
    key: settings?.bookingKey ?? null,
    url: settings?.bookingKey ? `${origin}/reservar/${settings.bookingKey}` : null,
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    return NextResponse.json({ ok: true, ...(await readSettings(session.clinicId, new URL(req.url).origin)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la reserva online.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const current = await prisma.clinicSettings.findUnique({
      where: { clinicId: session.clinicId },
      select: { bookingKey: true },
    });

    // La llave se crea al activar por primera vez o cuando se pide cambiarla.
    const needsKey = !current?.bookingKey && parsed.data.enabled === true;
    const bookingKey = parsed.data.regenerateKey || needsKey ? newBookingKey() : undefined;

    const data = {
      ...(parsed.data.enabled !== undefined ? { bookingEnabled: parsed.data.enabled } : {}),
      ...(parsed.data.slotMinutes !== undefined ? { bookingSlotMinutes: parsed.data.slotMinutes } : {}),
      ...(bookingKey ? { bookingKey } : {}),
    };

    await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true, ...(await readSettings(session.clinicId, new URL(req.url).origin)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la reserva online.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
