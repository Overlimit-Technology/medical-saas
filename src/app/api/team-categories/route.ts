import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido.").max(100),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  try {
    const session = await requireClinicSession();

    const items = await prisma.teamCategory.findMany({
      where: { clinicId: session.clinicId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar equipos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"]);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos invalidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.teamCategory.findUnique({
      where: { clinicId_name: { clinicId: session.clinicId, name: parsed.data.name } },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un equipo con ese nombre." },
        { status: 409 },
      );
    }

    const item = await prisma.teamCategory.create({
      data: { clinicId: session.clinicId, name: parsed.data.name },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear equipo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"]);

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "ID requerido." }, { status: 400 });
    }

    const category = await prisma.teamCategory.findFirst({
      where: { id: parsed.data.id, clinicId: session.clinicId },
    });

    if (!category) {
      return NextResponse.json({ ok: false, error: "Equipo no encontrado." }, { status: 404 });
    }

    await prisma.teamCategory.delete({ where: { id: parsed.data.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar equipo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
