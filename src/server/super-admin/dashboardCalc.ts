// Calculo puro del dashboard comercial del super admin (sin base de datos, verificable con pruebas).
// Reutiliza computeBillingMetrics para MRR, altas, bajas, churn y costos, y agrega actividad y filtros.
import { computeBillingMetrics, monthKey, type BillingClinicInput, type PlatformCostInput } from "./billingMetricsCalc";

export type BillingStatus = BillingClinicInput["billingStatus"];
export type StatusFilter = BillingStatus | "SUSPENDED";

export type DashClinicInput = BillingClinicInput & {
  city: string;
  createdAt: Date;
  patients: number;
  users: number; // miembros activos, sin contar a los super admin de la plataforma
  activeUsers: number; // los que ademas tienen la cuenta activa
  activeUsers30d: number; // con inicio de sesion en los ultimos 30 dias
};

export type DashActivityInput = { clinicId: string; month: string; appointments: number; newPatients: number };

export type DashFilters = {
  months: 3 | 6 | 12;
  plan?: string;
  status?: StatusFilter;
  city?: string;
  q?: string;
};

export const STATUS_LABELS: Record<BillingStatus, string> = {
  TRIAL: "En prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Morosa",
  CANCELED: "Cancelada",
};

export const NO_PLAN = "Sin plan";
export const NO_CITY = "Sin ciudad";

export type DashClinicRow = {
  id: string;
  name: string;
  city: string;
  plan: string;
  billingStatus: BillingStatus;
  isActive: boolean;
  monthlyPrice: number;
  paying: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  subscriptionStartedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  patients: number;
  newPatientsMonth: number;
  appointmentsMonth: number;
  users: number;
  activeUsers: number;
  activeUsers30d: number;
};

export type DashMonthRow = {
  month: string;
  mrr: number;
  mrrGrowth: number | null; // variacion contra el mes anterior (0.1 = +10%)
  newMrr: number;
  churnedMrr: number;
  payingClinics: number;
  newClinics: number;
  churnedClinics: number;
  netClinics: number;
  churnRate: number | null;
  costs: number | null; // null cuando hay filtros de sede: los costos son de toda la plataforma
  margin: number | null;
  marginPercent: number | null;
  appointments: number;
  newPatients: number;
};

export type DashboardData = {
  generatedAt: string;
  filters: DashFilters;
  filtersActive: boolean;
  options: { plans: string[]; cities: string[] };
  totals: { allClinics: number; filteredClinics: number };
  kpis: {
    mrr: number;
    arr: number;
    arpa: number | null;
    mrrGrowth: number | null;
    payingClinics: number;
    avgRevenuePerClinic: number | null; // MRR / sedes del filtro (incluye las que no pagan)
    churnRate: number | null;
    churnedClinics: number;
    churnedMrr: number;
    newClinicsRange: number;
    churnedClinicsRange: number;
    trialClinics: number;
    trialsExpiringSoon: number;
    pastDueClinics: number;
    mrrAtRisk: number;
    canceledClinics: number;
    suspendedClinics: number;
    costs: number | null;
    margin: number | null;
    marginPercent: number | null;
    appointmentsMonth: number;
    newPatientsMonth: number;
    patients: number;
    users: number;
    activeUsers30d: number;
  };
  statusDistribution: { status: BillingStatus; label: string; clinics: number; mrr: number }[];
  planDistribution: { plan: string; clinics: number; mrr: number }[];
  months: DashMonthRow[];
  topByRevenue: DashClinicRow[];
  topByUsage: DashClinicRow[];
  expiringTrials: DashClinicRow[];
  clinics: DashClinicRow[];
};

const DAY_MS = 86_400_000;
const round = (n: number) => Math.round(n);

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const planOf = (c: { planName: string | null }) => c.planName?.trim() || NO_PLAN;
const cityOf = (c: { city: string }) => c.city?.trim() || NO_CITY;

export function applyFilters(clinics: DashClinicInput[], filters: DashFilters) {
  const q = filters.q ? normalizeText(filters.q) : "";
  return clinics.filter((c) => {
    if (filters.plan && planOf(c) !== filters.plan) return false;
    if (filters.city && cityOf(c) !== filters.city) return false;
    if (filters.status === "SUSPENDED") {
      if (c.isActive) return false;
    } else if (filters.status && c.billingStatus !== filters.status) {
      return false;
    }
    if (q && !normalizeText(c.name).includes(q)) return false;
    return true;
  });
}

export function computeDashboard(
  allClinics: DashClinicInput[],
  costs: PlatformCostInput[],
  activity: DashActivityInput[],
  filters: DashFilters,
  now: Date
): DashboardData {
  const filtersActive = Boolean(filters.plan || filters.status || filters.city || filters.q);
  const clinics = applyFilters(allClinics, filters);
  const ids = new Set(clinics.map((c) => c.id));

  // Un mes extra al inicio solo para poder calcular el crecimiento del primer mes visible.
  const billing = computeBillingMetrics(clinics, costs, now, filters.months + 1);
  const curKey = monthKey(now);

  const actByMonth = new Map<string, { appointments: number; newPatients: number }>();
  const actByClinic = new Map<string, { appointments: number; newPatients: number }>();
  for (const a of activity) {
    if (!ids.has(a.clinicId)) continue;
    const m = actByMonth.get(a.month) ?? { appointments: 0, newPatients: 0 };
    m.appointments += a.appointments;
    m.newPatients += a.newPatients;
    actByMonth.set(a.month, m);
    if (a.month === curKey) {
      const c = actByClinic.get(a.clinicId) ?? { appointments: 0, newPatients: 0 };
      c.appointments += a.appointments;
      c.newPatients += a.newPatients;
      actByClinic.set(a.clinicId, c);
    }
  }

  const months: DashMonthRow[] = billing.months.slice(1).map((m, i) => {
    const prev = billing.months[i];
    const act = actByMonth.get(m.month) ?? { appointments: 0, newPatients: 0 };
    return {
      month: m.month,
      mrr: m.mrr,
      mrrGrowth: prev.mrr > 0 ? (m.mrr - prev.mrr) / prev.mrr : null,
      newMrr: m.newMrr,
      churnedMrr: m.churnedMrr,
      payingClinics: m.payingClinics,
      newClinics: m.newClinics,
      churnedClinics: m.churnedClinics,
      netClinics: m.newClinics - m.churnedClinics,
      churnRate: m.churnRate,
      costs: filtersActive ? null : m.costs,
      margin: filtersActive ? null : m.margin,
      marginPercent: filtersActive ? null : m.marginPercent,
      appointments: act.appointments,
      newPatients: act.newPatients,
    };
  });
  const cur = months[months.length - 1];

  const rows: DashClinicRow[] = clinics.map((c) => {
    const bill = billing.clinics.find((x) => x.id === c.id);
    const act = actByClinic.get(c.id);
    const trialDaysLeft =
      c.billingStatus === "TRIAL" && c.trialEndsAt ? Math.ceil((c.trialEndsAt.getTime() - now.getTime()) / DAY_MS) : null;
    return {
      id: c.id,
      name: c.name,
      city: cityOf(c),
      plan: planOf(c),
      billingStatus: c.billingStatus,
      isActive: c.isActive,
      monthlyPrice: round(c.monthlyPrice ?? 0),
      paying: bill?.paying ?? false,
      trialEndsAt: c.trialEndsAt ? c.trialEndsAt.toISOString() : null,
      trialDaysLeft,
      subscriptionStartedAt: c.subscriptionStartedAt ? c.subscriptionStartedAt.toISOString() : null,
      canceledAt: c.canceledAt ? c.canceledAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      patients: c.patients,
      newPatientsMonth: act?.newPatients ?? 0,
      appointmentsMonth: act?.appointments ?? 0,
      users: c.users,
      activeUsers: c.activeUsers,
      activeUsers30d: c.activeUsers30d,
    };
  });

  const statusDistribution = (Object.keys(STATUS_LABELS) as BillingStatus[]).map((status) => {
    const inStatus = rows.filter((r) => r.billingStatus === status);
    return {
      status,
      label: STATUS_LABELS[status],
      clinics: inStatus.length,
      mrr: inStatus.filter((r) => r.paying).reduce((s, r) => s + r.monthlyPrice, 0),
    };
  });

  const topByRevenue = rows
    .filter((r) => r.paying)
    .sort((a, b) => b.monthlyPrice - a.monthlyPrice || a.name.localeCompare(b.name))
    .slice(0, 5);
  const topByUsage = rows
    .filter((r) => r.appointmentsMonth > 0 || r.patients > 0)
    .sort((a, b) => b.appointmentsMonth - a.appointmentsMonth || b.patients - a.patients || a.name.localeCompare(b.name))
    .slice(0, 5);
  const expiringTrials = rows
    .filter((r) => r.billingStatus === "TRIAL" && r.isActive && r.trialDaysLeft !== null)
    .sort((a, b) => (a.trialDaysLeft ?? 0) - (b.trialDaysLeft ?? 0))
    .slice(0, 8);

  const sum = (f: (r: DashClinicRow) => number) => rows.reduce((s, r) => s + f(r), 0);

  return {
    generatedAt: now.toISOString(),
    filters,
    filtersActive,
    options: {
      plans: Array.from(new Set(allClinics.map(planOf))).sort((a, b) => a.localeCompare(b)),
      cities: Array.from(new Set(allClinics.map(cityOf))).sort((a, b) => a.localeCompare(b)),
    },
    totals: { allClinics: allClinics.length, filteredClinics: clinics.length },
    kpis: {
      mrr: billing.mrr,
      arr: billing.arr,
      arpa: billing.arpa,
      mrrGrowth: cur.mrrGrowth,
      payingClinics: billing.payingClinics,
      avgRevenuePerClinic: rows.length ? round(billing.mrr / rows.length) : null,
      churnRate: cur.churnRate,
      churnedClinics: cur.churnedClinics,
      churnedMrr: cur.churnedMrr,
      newClinicsRange: months.reduce((s, m) => s + m.newClinics, 0),
      churnedClinicsRange: months.reduce((s, m) => s + m.churnedClinics, 0),
      trialClinics: billing.trialClinics,
      trialsExpiringSoon: billing.trialsExpiringSoon,
      pastDueClinics: billing.pastDueClinics,
      mrrAtRisk: billing.mrrAtRisk,
      canceledClinics: billing.canceledClinics,
      suspendedClinics: rows.filter((r) => !r.isActive).length,
      costs: cur.costs,
      margin: cur.margin,
      marginPercent: cur.marginPercent,
      appointmentsMonth: sum((r) => r.appointmentsMonth),
      newPatientsMonth: sum((r) => r.newPatientsMonth),
      patients: sum((r) => r.patients),
      users: sum((r) => r.users),
      activeUsers30d: sum((r) => r.activeUsers30d),
    },
    statusDistribution,
    planDistribution: billing.byPlan.map((p) => ({ plan: p.plan, clinics: p.clinics, mrr: p.mrr })),
    months,
    topByRevenue,
    topByUsage,
    expiringTrials,
    clinics: rows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
