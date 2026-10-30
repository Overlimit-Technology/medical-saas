// Calculo puro de metricas comerciales (sin base de datos) para poder verificarlo con pruebas.
//
// Definiciones:
// - Una sede "paga" en una fecha D si tiene precio mensual > 0, subscriptionStartedAt <= D y
//   (canceledAt es nulo o canceledAt > D).
// - MRR = suma del precio mensual de las sedes que pagan. ARR = MRR x 12. ARPA = MRR / sedes que pagan.
// - Churn de un mes = sedes canceladas en el mes / sedes que pagaban al inicio del mes.
// - Margen del mes = MRR al cierre del mes - costos de plataforma del mes.

export type BillingClinicInput = {
  id: string;
  name: string;
  isActive: boolean;
  billingStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  planName: string | null;
  monthlyPrice: number | null;
  trialEndsAt: Date | null;
  subscriptionStartedAt: Date | null;
  canceledAt: Date | null;
};

export type PlatformCostInput = { month: string; category: string; amount: number };

export type BillingMonthRow = {
  month: string;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  payingClinics: number;
  newClinics: number;
  churnedClinics: number;
  churnRate: number | null;
  costs: number;
  margin: number;
  marginPercent: number | null;
};

export type BillingMetrics = {
  generatedAt: string;
  currency: "CLP";
  mrr: number;
  arr: number;
  arpa: number | null;
  payingClinics: number;
  pastDueClinics: number;
  mrrAtRisk: number;
  trialClinics: number;
  trialsExpiringSoon: number;
  canceledClinics: number;
  currentMonth: BillingMonthRow;
  months: BillingMonthRow[];
  byPlan: { plan: string; clinics: number; mrr: number }[];
  costsByCategory: { category: string; amount: number }[];
  clinics: {
    id: string;
    name: string;
    plan: string;
    status: BillingClinicInput["billingStatus"];
    monthlyPrice: number;
    paying: boolean;
    trialEndsAt: string | null;
    subscriptionStartedAt: string | null;
  }[];
};

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function payingAt(clinic: BillingClinicInput, at: Date) {
  const price = clinic.monthlyPrice ?? 0;
  if (price <= 0 || !clinic.subscriptionStartedAt) return false;
  if (clinic.subscriptionStartedAt.getTime() > at.getTime()) return false;
  return !clinic.canceledAt || clinic.canceledAt.getTime() > at.getTime();
}

function inRange(value: Date | null, from: Date, to: Date) {
  return value !== null && value.getTime() >= from.getTime() && value.getTime() < to.getTime();
}

const round = (value: number) => Math.round(value);

export function computeBillingMetrics(
  clinics: BillingClinicInput[],
  costs: PlatformCostInput[],
  now: Date,
  monthsBack = 6
): BillingMetrics {
  const price = (c: BillingClinicInput) => c.monthlyPrice ?? 0;

  const months: BillingMonthRow[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    // Mes en curso: se mide "ahora". Meses cerrados: ultimo instante del mes.
    const end = i === 0 ? now : new Date(next.getTime() - 1);

    const payingEnd = clinics.filter((c) => payingAt(c, end));
    const payingStart = clinics.filter((c) => payingAt(c, new Date(start.getTime() - 1)));
    const newOnes = clinics.filter((c) => price(c) > 0 && inRange(c.subscriptionStartedAt, start, next));
    const churned = clinics.filter(
      (c) => price(c) > 0 && c.subscriptionStartedAt !== null && inRange(c.canceledAt, start, next)
    );
    const key = monthKey(start);
    const monthCosts = costs.filter((x) => x.month === key).reduce((s, x) => s + x.amount, 0);
    const mrr = payingEnd.reduce((s, c) => s + price(c), 0);
    const margin = mrr - monthCosts;

    months.push({
      month: key,
      mrr: round(mrr),
      newMrr: round(newOnes.reduce((s, c) => s + price(c), 0)),
      churnedMrr: round(churned.reduce((s, c) => s + price(c), 0)),
      payingClinics: payingEnd.length,
      newClinics: newOnes.length,
      churnedClinics: churned.length,
      churnRate: payingStart.length ? churned.length / payingStart.length : null,
      costs: round(monthCosts),
      margin: round(margin),
      marginPercent: mrr > 0 ? margin / mrr : null,
    });
  }

  const paying = clinics.filter((c) => payingAt(c, now));
  const mrr = paying.reduce((s, c) => s + price(c), 0);
  const pastDue = paying.filter((c) => c.billingStatus === "PAST_DUE");
  const soon = new Date(now.getTime() + 7 * 86_400_000);
  const trials = clinics.filter((c) => c.billingStatus === "TRIAL" && c.isActive);

  const planMap = new Map<string, { clinics: number; mrr: number }>();
  for (const c of paying) {
    const key = c.planName?.trim() || "Sin plan";
    const cur = planMap.get(key) ?? { clinics: 0, mrr: 0 };
    planMap.set(key, { clinics: cur.clinics + 1, mrr: cur.mrr + price(c) });
  }

  const currentKey = monthKey(now);
  const catMap = new Map<string, number>();
  for (const x of costs.filter((c) => c.month === currentKey)) {
    catMap.set(x.category, (catMap.get(x.category) ?? 0) + x.amount);
  }

  return {
    generatedAt: now.toISOString(),
    currency: "CLP",
    mrr: round(mrr),
    arr: round(mrr * 12),
    arpa: paying.length ? round(mrr / paying.length) : null,
    payingClinics: paying.length,
    pastDueClinics: pastDue.length,
    mrrAtRisk: round(pastDue.reduce((s, c) => s + price(c), 0)),
    trialClinics: trials.length,
    trialsExpiringSoon: trials.filter((c) => c.trialEndsAt && c.trialEndsAt >= now && c.trialEndsAt <= soon).length,
    canceledClinics: clinics.filter((c) => c.billingStatus === "CANCELED").length,
    currentMonth: months[months.length - 1],
    months,
    byPlan: Array.from(planMap.entries())
      .map(([plan, v]) => ({ plan, clinics: v.clinics, mrr: round(v.mrr) }))
      .sort((a, b) => b.mrr - a.mrr),
    costsByCategory: Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    clinics: clinics
      .map((c) => ({
        id: c.id,
        name: c.name,
        plan: c.planName?.trim() || "Sin plan",
        status: c.billingStatus,
        monthlyPrice: round(price(c)),
        paying: payingAt(c, now),
        trialEndsAt: c.trialEndsAt ? c.trialEndsAt.toISOString() : null,
        subscriptionStartedAt: c.subscriptionStartedAt ? c.subscriptionStartedAt.toISOString() : null,
      }))
      .sort((a, b) => Number(b.paying) - Number(a.paying) || b.monthlyPrice - a.monthlyPrice || a.name.localeCompare(b.name)),
  };
}
