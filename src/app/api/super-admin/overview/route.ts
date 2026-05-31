import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/server/auth/requireSession";

function formatDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function timeAgo(value: Date) {
  const now = Date.now();
  const diffMs = Math.max(0, now - value.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export async function GET() {
  try {
    const session = await requireAuthSession();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    const [clinics, usersCreatedMonth, usersCreatedPrevMonth, clinicsCreatedMonth, clinicsCreatedPrevMonth, recentClinics, recentUsers] =
      await Promise.all([
        prisma.clinic.findMany({
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            city: true,
            isActive: true,
            createdAt: true,
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
        }),
        prisma.user.count({
          where: { createdAt: { gte: monthStart } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
        }),
        prisma.clinic.count({
          where: { createdAt: { gte: monthStart } },
        }),
        prisma.clinic.count({
          where: { createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
        }),
        prisma.clinic.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { id: true, name: true, createdAt: true },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: {
              select: { firstName: true, lastName: true },
            },
            clinicMemberships: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: {
                clinic: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

    const clinicRows = clinics.map((clinic) => {
      const activeUsers = clinic.memberships.filter((membership) => membership.user.status === "ACTIVE").length;
      const inactiveUsers = clinic.memberships.filter((membership) => membership.user.status !== "ACTIVE").length;
      return {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        status: clinic.isActive ? "active" : "inactive",
        totalUsers: clinic.memberships.length,
        activeUsers,
        inactiveUsers,
      };
    });

    const totalClinics = clinicRows.length;
    const activeClinics = clinicRows.filter((item) => item.status === "active").length;
    const totalUsers = clinicRows.reduce((acc, item) => acc + item.totalUsers, 0);
    const activeUsers = clinicRows.reduce((acc, item) => acc + item.activeUsers, 0);

    const clinicEvents = recentClinics.map((clinic) => ({
      id: `clinic-${clinic.id}`,
      time: clinic.createdAt.getTime(),
      text: `Clinica ${clinic.name} fue creada`,
      tone: "teal" as const,
    }));

    const userEvents = recentUsers.map((user) => {
      const profileName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim();
      const displayName = profileName.length > 0 ? profileName : user.email;
      const clinicName = user.clinicMemberships[0]?.clinic.name;
      return {
        id: `user-${user.id}`,
        time: user.createdAt.getTime(),
        text: clinicName
          ? `Usuario ${displayName} creado en ${clinicName}`
          : `Usuario ${displayName} fue creado`,
        tone: "success" as const,
      };
    });

    const activity = [...clinicEvents, ...userEvents]
      .sort((a, b) => b.time - a.time)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        text: item.text,
        timeLabel: timeAgo(new Date(item.time)),
        tone: item.tone,
      }));

    return NextResponse.json({
      ok: true,
      data: {
        stats: {
          totalClinics,
          activeClinics,
          totalUsers,
          activeUsers,
          newClinicsMonth: clinicsCreatedMonth,
          newClinicsDelta: formatDelta(clinicsCreatedMonth, clinicsCreatedPrevMonth),
          newUsersMonth: usersCreatedMonth,
          newUsersDelta: formatDelta(usersCreatedMonth, usersCreatedPrevMonth),
        },
        clinics: clinicRows,
        activity,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el resumen.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
