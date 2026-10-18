import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { DoctorsService } from "@/server/doctors/DoctorsService";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");

    if (params.id === session.userId) {
      return NextResponse.json(
        { ok: false, error: "No puedes eliminar tu propio usuario." },
        { status: 409 }
      );
    }

    const target = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: { in: ["ADMIN", "DOCTOR", "SECRETARY"] },
        isSuperAdmin: false,
        clinicMemberships: {
          some: { clinicId: session.clinicId, status: "ACTIVE" },
        },
      },
      select: {
        id: true,
        role: true,
        clinicMemberships: { where: { status: "ACTIVE" }, select: { clinicId: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    // Solo un administrador puede eliminar a otro administrador.
    if (target.role === "ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Solo un administrador puede eliminar a otro administrador." },
        { status: 403 }
      );
    }

    // Si pertenece a otras sedes, solo se le quita el acceso a esta: nunca se borra su cuenta global.
    const otherClinics = target.clinicMemberships.filter((m) => m.clinicId !== session.clinicId);
    if (otherClinics.length > 0) {
      await prisma.clinicMembership.updateMany({
        where: { userId: target.id, clinicId: session.clinicId },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({ ok: true, softDeleted: true, scope: "clinic" });
    }

    if (target.role === "DOCTOR") {
      const result = await DoctorsService.remove(target.id, session.clinicId);
      return NextResponse.json({ ok: true, ...result });
    }

    await prisma.user.delete({ where: { id: target.id } });
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se puede eliminar el usuario porque tiene registros asociados.",
        },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
    const status = message.toLowerCase().includes("no encontrado") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
