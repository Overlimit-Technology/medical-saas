import { prisma } from "@/lib/prisma";
import { computeBillingMetrics, type BillingMetrics } from "./billingMetricsCalc";

// Carga las sedes y los costos de plataforma y calcula las metricas comerciales.
// Solo debe llamarse despues de comprobar session.isSuperAdmin.
export async function getBillingMetrics(now = new Date()): Promise<BillingMetrics> {
  const [clinics, costs] = await Promise.all([
    prisma.clinic.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        billingStatus: true,
        planName: true,
        monthlyPrice: true,
        trialEndsAt: true,
        subscriptionStartedAt: true,
        canceledAt: true,
      },
    }),
    prisma.platformCost.findMany({ select: { month: true, category: true, amount: true } }),
  ]);

  return computeBillingMetrics(
    clinics.map((c) => ({ ...c, monthlyPrice: c.monthlyPrice === null ? null : Number(c.monthlyPrice) })),
    costs.map((c) => ({ ...c, amount: Number(c.amount) })),
    now
  );
}
