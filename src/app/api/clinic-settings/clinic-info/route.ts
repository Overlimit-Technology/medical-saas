import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(120).optional(),
  address: z.string().max(250).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  logo: z.string().max(500).optional().nullable(),
  openingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  closingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
});

const SELECT = {
  id: true,
  name: true,
  city: true,
  address: true,
  phone: true,
  email: true,
  logo: true,
  openingTime: true,
  closingTime: true,
} as const;

export async function GET() {
  try {
    const session = await requireClinicSession();
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: SELECT,
    });

    if (!clinic) {
      return NextResponse.json({ ok: false, error: "Clinica no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: clinic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar datos de la clinica.";
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

    const clinic = await prisma.clinic.update({
      where: { id: session.clinicId },
      data: parsed.data,
      select: SELECT,
    });

    return NextResponse.json({ ok: true, item: clinic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar la clinica.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
