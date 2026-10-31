import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { MAP_COLS, MAP_ROWS } from "@/lib/clinicMap";

export const dynamic = "force-dynamic";

// Cada figura es un box de la sede o un area libre (recepcion, sala de espera...).

const shapeSchema = z
  .object({
    id: z.string().min(1).max(40),
    kind: z.enum(["box", "area"]),
    boxId: z.string().min(1).max(40).nullable().optional(),
    label: z.string().trim().min(1).max(40),
    x: z.number().int().min(0).max(MAP_COLS - 1),
    y: z.number().int().min(0).max(MAP_ROWS - 1),
    w: z.number().int().min(1).max(MAP_COLS),
    h: z.number().int().min(1).max(MAP_ROWS),
  })
  .refine((s) => s.x + s.w <= MAP_COLS && s.y + s.h <= MAP_ROWS, "La figura se sale del plano.")
  .refine((s) => s.kind === "area" || Boolean(s.boxId), "Un box del mapa debe estar vinculado a un box.");

const mapSchema = z.object({ shapes: z.array(shapeSchema).max(120) });

export async function GET() {
  try {
    const session = await requireClinicSession();
    const settings = await prisma.clinicSettings.findUnique({
      where: { clinicId: session.clinicId },
      select: { clinicMap: true },
    });
    const parsed = mapSchema.safeParse(settings?.clinicMap ?? { shapes: [] });
    return NextResponse.json({ ok: true, map: parsed.success ? parsed.data : { shapes: [] } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el mapa.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "BOXES");
    const parsed = mapSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Mapa invalido." }, { status: 400 });
    }

    // Solo se aceptan boxes de esta sede.
    const boxIds = parsed.data.shapes.filter((s) => s.kind === "box").map((s) => s.boxId as string);
    if (boxIds.length) {
      const owned = await prisma.box.count({ where: { clinicId: session.clinicId, id: { in: boxIds } } });
      if (owned !== new Set(boxIds).size) {
        return NextResponse.json({ ok: false, error: "Hay boxes que no son de esta sede." }, { status: 400 });
      }
    }

    await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId, clinicMap: parsed.data },
      update: { clinicMap: parsed.data },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, map: parsed.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el mapa.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
