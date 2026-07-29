import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/server/auth/requireSession";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  usesNewPlatform: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: { userId: string } }) {
  try {
    const session = await requireAuthSession();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const hasStatus = typeof parsed.data.status !== "undefined";
    const hasPlatform = typeof parsed.data.usesNewPlatform !== "undefined";

    if (!hasStatus && !hasPlatform) {
      return NextResponse.json({ ok: false, error: "No hay cambios para aplicar." }, { status: 400 });
    }

    if (
      context.params.userId === session.userId &&
      (parsed.data.status === "SUSPENDED" || parsed.data.usesNewPlatform === false)
    ) {
      return NextResponse.json(
        { ok: false, error: "No puedes quitarte el acceso a ti mismo desde este módulo." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: context.params.userId },
      data: {
        ...(hasStatus ? { status: parsed.data.status } : {}),
        ...(hasPlatform ? { usesNewPlatform: parsed.data.usesNewPlatform } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        usesNewPlatform: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
        usesNewPlatform: user.usesNewPlatform,
        firstName: user.profile?.firstName ?? "",
        lastName: user.profile?.lastName ?? "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
