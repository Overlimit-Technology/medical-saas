import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicSession } from "@/server/auth/requireSession";

export async function GET(_: Request, context: { params: { clinicId: string } }) {
  try {
    const session = await requireClinicSession();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: context.params.clinicId },
      select: { id: true, name: true, city: true, isActive: true },
    });

    if (!clinic) {
      return NextResponse.json({ ok: false, error: "Sede no encontrada." }, { status: 404 });
    }

    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId: clinic.id,
        status: "ACTIVE",
      },
      orderBy: [
        { user: { status: "asc" } },
        { user: { profile: { firstName: "asc" } } },
        { user: { email: "asc" } },
      ],
      select: {
        id: true,
        user: {
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
        },
      },
    });

    const items = memberships.map((membership) => ({
      membershipId: membership.id,
      id: membership.user.id,
      email: membership.user.email,
      role: membership.user.role,
      status: membership.user.status,
      isSuperAdmin: membership.user.isSuperAdmin,
      usesNewPlatform: membership.user.usesNewPlatform,
      firstName: membership.user.profile?.firstName ?? "",
      lastName: membership.user.profile?.lastName ?? "",
    }));

    return NextResponse.json({ ok: true, clinic, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los usuarios.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
