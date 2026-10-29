import { prisma } from "@/lib/prisma";
import { computeDashboard, type DashActivityInput, type DashFilters, type DashboardData } from "./dashboardCalc";

const DAY_MS = 86_400_000;

// Carga sedes, costos y actividad y calcula el dashboard. Solo llamar tras requireSuperAdmin().
export async function getDashboardData(filters: DashFilters, now = new Date()): Promise<DashboardData> {
  // Se piden 13 meses de actividad como maximo (12 visibles + 1 de referencia).
  const from = new Date(now.getFullYear(), now.getMonth() - filters.months, 1);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  const [clinics, costs, appts, newPatients] = await Promise.all([
    prisma.clinic.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true,
        createdAt: true,
        billingStatus: true,
        planName: true,
        monthlyPrice: true,
        trialEndsAt: true,
        subscriptionStartedAt: true,
        canceledAt: true,
        _count: { select: { patients: true } },
        memberships: {
          where: { status: "ACTIVE", user: { isSuperAdmin: false } },
          select: { user: { select: { status: true, lastLoginAt: true } } },
        },
      },
    }),
    prisma.platformCost.findMany({ select: { month: true, category: true, amount: true } }),
    // Consultas parametrizadas (plantilla etiquetada): nada se interpola en el SQL.
    prisma.$queryRaw<{ clinicId: string; month: string; n: number }[]>`
      SELECT "clinicId", to_char("startAt", 'YYYY-MM') AS month, COUNT(*)::int AS n
      FROM "Appointment"
      WHERE "startAt" >= ${from} AND status <> 'CANCELLED'
      GROUP BY 1, 2`,
    prisma.$queryRaw<{ clinicId: string; month: string; n: number }[]>`
      SELECT "clinicId", to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::int AS n
      FROM "Patient"
      WHERE "createdAt" >= ${from}
      GROUP BY 1, 2`,
  ]);

  const activityMap = new Map<string, DashActivityInput>();
  const put = (clinicId: string, month: string, key: "appointments" | "newPatients", n: number) => {
    const id = `${clinicId}|${month}`;
    const cur = activityMap.get(id) ?? { clinicId, month, appointments: 0, newPatients: 0 };
    cur[key] += n;
    activityMap.set(id, cur);
  };
  for (const a of appts) put(a.clinicId, a.month, "appointments", Number(a.n));
  for (const p of newPatients) put(p.clinicId, p.month, "newPatients", Number(p.n));

  return computeDashboard(
    clinics.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      isActive: c.isActive,
      createdAt: c.createdAt,
      billingStatus: c.billingStatus,
      planName: c.planName,
      monthlyPrice: c.monthlyPrice === null ? null : Number(c.monthlyPrice),
      trialEndsAt: c.trialEndsAt,
      subscriptionStartedAt: c.subscriptionStartedAt,
      canceledAt: c.canceledAt,
      patients: c._count.patients,
      users: c.memberships.length,
      activeUsers: c.memberships.filter((m) => m.user.status === "ACTIVE").length,
      activeUsers30d: c.memberships.filter(
        (m) => m.user.status === "ACTIVE" && m.user.lastLoginAt && m.user.lastLoginAt >= since30
      ).length,
    })),
    costs.map((c) => ({ ...c, amount: Number(c.amount) })),
    Array.from(activityMap.values()),
    filters,
    now
  );
}
