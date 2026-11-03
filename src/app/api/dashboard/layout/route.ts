import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LAYOUT, layoutSchema, normalizeWidget, readLayout, type DashboardLayout } from "@/lib/dashboard/catalog";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";

/**
 * Diseño del panel personalizable de cada admin en cada sede (ClinicMembership.dashboardLayout).
 * GET devuelve el guardado o el diseño por defecto; PUT lo reemplaza; DELETE vuelve al de defecto.
 */

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = mapErrorToHttpStatus(message);
  if (status >= 500) console.error("Error en el diseño del panel:", error);
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const [membership, clinic] = await Promise.all([
      prisma.clinicMembership.findUnique({
        where: { userId_clinicId: { userId: session.userId, clinicId: session.clinicId } },
        select: { dashboardLayout: true },
      }),
      prisma.clinic.findUnique({ where: { id: session.clinicId }, select: { name: true } }),
    ]);
    const saved = membership?.dashboardLayout ?? null;
    return NextResponse.json({
      ok: true,
      // Los diseños de la version 1 (12 columnas) se convierten a los tamaños de la grilla de 4.
      data: { layout: (saved && readLayout(saved)) || DEFAULT_LAYOUT, isDefault: !saved, clinicName: clinic?.name ?? "" },
    });
  } catch (error) {
    return errorResponse(error, "No se pudo cargar el diseño del panel.");
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const parsed = layoutSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "El diseño del panel no es válido." }, { status: 400 });
    }
    const layout: DashboardLayout = { ...parsed.data, widgets: parsed.data.widgets.map(normalizeWidget) };
    const updated = await prisma.clinicMembership.updateMany({
      where: { userId: session.userId, clinicId: session.clinicId },
      data: { dashboardLayout: layout },
    });
    if (!updated.count) {
      return NextResponse.json({ ok: false, error: "No perteneces a esta sede, así que el diseño no se puede guardar." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, data: { layout } });
  } catch (error) {
    return errorResponse(error, "No se pudo guardar el diseño del panel.");
  }
}

export async function DELETE() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    await prisma.clinicMembership.updateMany({
      where: { userId: session.userId, clinicId: session.clinicId },
      data: { dashboardLayout: Prisma.DbNull },
    });
    return NextResponse.json({ ok: true, data: { layout: DEFAULT_LAYOUT } });
  } catch (error) {
    return errorResponse(error, "No se pudo restablecer el panel.");
  }
}
