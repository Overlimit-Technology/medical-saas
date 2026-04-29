import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/server/auth/requireSession";

export async function GET() {
  try {
    const session = await requireAuthSession();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
    }

    const clinics = await prisma.clinic.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: {
            user: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    const items = clinics.map((clinic) => {
      const activeUsers = clinic.memberships.filter((membership) => membership.user.status === "ACTIVE").length;
      const inactiveUsers = clinic.memberships.filter((membership) => membership.user.status !== "ACTIVE").length;

      return {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        isActive: clinic.isActive,
        totalUsers: clinic.memberships.length,
        activeUsers,
        inactiveUsers,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las sedes.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
