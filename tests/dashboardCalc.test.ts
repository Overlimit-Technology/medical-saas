// Ejecutar: npm run test:dashboard
// Fecha fija (29-oct-2026 12:00) para que el resultado no dependa del reloj.
import assert from "node:assert/strict";
import test from "node:test";
import { computeDashboard, type DashClinicInput, type DashFilters } from "../src/server/super-admin/dashboardCalc";
import { planClinicAction, clinicActionSchema, type CommercialClinic } from "../src/server/super-admin/clinicActions";

const now = new Date(2026, 9, 29, 12, 0, 0);
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

function clinic(p: Partial<DashClinicInput> & { id: string }): DashClinicInput {
  return {
    name: p.id,
    city: "Santiago",
    isActive: true,
    billingStatus: "ACTIVE",
    planName: null,
    monthlyPrice: null,
    trialEndsAt: null,
    subscriptionStartedAt: null,
    canceledAt: null,
    createdAt: d(2026, 1, 1),
    patients: 0,
    users: 0,
    activeUsers: 0,
    activeUsers30d: 0,
    ...p,
  };
}

const clinics: DashClinicInput[] = [
  clinic({ id: "A", planName: "Pro", monthlyPrice: 90000, subscriptionStartedAt: d(2026, 5, 5), patients: 100, users: 3, activeUsers: 3, activeUsers30d: 2 }),
  clinic({ id: "B", city: "Temuco", planName: "Starter", monthlyPrice: 40000, billingStatus: "PAST_DUE", subscriptionStartedAt: d(2026, 7, 5), patients: 20, users: 1, activeUsers: 1 }),
  clinic({ id: "C", isActive: false, billingStatus: "CANCELED", planName: "Pro", monthlyPrice: 90000, subscriptionStartedAt: d(2026, 6, 5), canceledAt: d(2026, 9, 10) }),
  clinic({ id: "D", planName: "Starter", monthlyPrice: 40000, subscriptionStartedAt: d(2026, 10, 1), patients: 5 }),
  clinic({ id: "E", name: "Clínica Valdivia", city: "Valdivia", billingStatus: "TRIAL", planName: "Pro", monthlyPrice: 90000, trialEndsAt: d(2026, 11, 3) }),
];
const costs = [
  { month: "2026-10", category: "Infraestructura", amount: 30000 },
  { month: "2026-10", category: "IA", amount: 15000 },
  { month: "2026-09", category: "Infraestructura", amount: 30000 },
];
const activity = [
  { clinicId: "A", month: "2026-10", appointments: 20, newPatients: 3 },
  { clinicId: "A", month: "2026-09", appointments: 15, newPatients: 2 },
  { clinicId: "B", month: "2026-10", appointments: 5, newPatients: 1 },
  { clinicId: "D", month: "2026-10", appointments: 4, newPatients: 0 },
];
const base: DashFilters = { months: 6 };
const run = (f: Partial<DashFilters> = {}) => computeDashboard(clinics, costs, activity, { ...base, ...f }, now);

test("sin filtros: MRR, ARR, ARPA y promedio por sede", () => {
  const { kpis } = run();
  assert.equal(kpis.mrr, 170000);
  assert.equal(kpis.arr, 2040000);
  assert.equal(kpis.payingClinics, 3);
  assert.equal(kpis.arpa, 56667);
  assert.equal(kpis.avgRevenuePerClinic, 34000); // 170000 / 5 sedes
});

test("margen = MRR - costos del mes sin filtros", () => {
  const { kpis } = run();
  assert.equal(kpis.costs, 45000);
  assert.equal(kpis.margin, 125000);
});

test("serie mensual: largo, altas, bajas, churn y crecimiento", () => {
  const { months } = run();
  assert.equal(months.length, 6);
  assert.equal(months[0].month, "2026-05");
  const oct = months[5];
  const sep = months[4];
  assert.equal(oct.newClinics, 1);
  assert.equal(oct.churnedClinics, 0);
  assert.equal(oct.mrr, 170000);
  assert.equal(sep.mrr, 130000);
  assert.ok(Math.abs((oct.mrrGrowth ?? 0) - (170000 / 130000 - 1)) < 1e-9);
  assert.equal(sep.churnedClinics, 1);
  assert.ok(Math.abs((sep.churnRate ?? 0) - 1 / 3) < 1e-9);
});

test("rango de 3 y 12 meses", () => {
  assert.equal(run({ months: 3 }).months.length, 3);
  assert.equal(run({ months: 12 }).months.length, 12);
  assert.equal(run({ months: 3 }).kpis.newClinicsRange, 1);
});

test("estados y planes", () => {
  const r = run();
  const by = Object.fromEntries(r.statusDistribution.map((s) => [s.status, s]));
  assert.equal(by.ACTIVE.clinics, 2);
  assert.equal(by.ACTIVE.mrr, 130000);
  assert.equal(by.PAST_DUE.clinics, 1);
  assert.equal(by.CANCELED.clinics, 1);
  assert.equal(by.TRIAL.clinics, 1);
  assert.equal(r.kpis.pastDueClinics, 1);
  assert.equal(r.kpis.mrrAtRisk, 40000);
  assert.equal(r.kpis.suspendedClinics, 1);
  assert.deepEqual(r.planDistribution.map((p) => [p.plan, p.clinics, p.mrr]), [["Pro", 1, 90000], ["Starter", 2, 80000]]);
  assert.deepEqual(r.options.plans, ["Pro", "Starter"]);
});

test("trials por vencer", () => {
  const r = run();
  assert.equal(r.kpis.trialClinics, 1);
  assert.equal(r.kpis.trialsExpiringSoon, 1);
  assert.equal(r.expiringTrials[0].id, "E");
  assert.equal(r.expiringTrials[0].trialDaysLeft, 5);
});

test("actividad del mes en curso", () => {
  const { kpis, topByUsage, months } = run();
  assert.equal(kpis.appointmentsMonth, 29);
  assert.equal(kpis.newPatientsMonth, 4);
  assert.equal(kpis.patients, 125);
  assert.equal(topByUsage[0].id, "A");
  assert.equal(months[5].appointments, 29);
  assert.equal(months[4].appointments, 15);
});

test("top por ingreso solo incluye sedes que pagan", () => {
  const { topByRevenue } = run();
  assert.deepEqual(topByRevenue.map((c) => c.id), ["A", "B", "D"]);
});

test("filtro por plan", () => {
  const r = run({ plan: "Pro" });
  assert.equal(r.totals.filteredClinics, 3); // A, C, E
  assert.equal(r.kpis.mrr, 90000);
  assert.equal(r.kpis.margin, null); // los costos son de toda la plataforma
  assert.equal(r.filtersActive, true);
  assert.equal(r.totals.allClinics, 5);
});

test("filtro por estado y por suspendida", () => {
  assert.deepEqual(run({ status: "PAST_DUE" }).clinics.map((c) => c.id), ["B"]);
  assert.deepEqual(run({ status: "SUSPENDED" }).clinics.map((c) => c.id), ["C"]);
  assert.equal(run({ status: "TRIAL" }).kpis.mrr, 0);
});

test("filtro por ciudad y busqueda sin tildes ni mayusculas", () => {
  const r = run({ city: "Santiago" });
  assert.equal(r.kpis.mrr, 130000);
  assert.deepEqual(run({ q: "CLINICA valdi" }).clinics.map((c) => c.id), ["E"]);
  assert.equal(run({ q: "no existe" }).clinics.length, 0);
  assert.equal(run({ q: "no existe" }).kpis.mrr, 0);
});

test("filtros sin resultados: sin divisiones por cero", () => {
  const r = run({ q: "no existe" });
  assert.equal(r.kpis.arpa, null);
  assert.equal(r.kpis.avgRevenuePerClinic, null);
  assert.equal(r.months.length, 6);
});

// ---------- acciones sobre una sede ----------
const trial: CommercialClinic = { isActive: true, billingStatus: "TRIAL", monthlyPrice: 90000, trialEndsAt: d(2026, 11, 3), subscriptionStartedAt: null };
const active: CommercialClinic = { isActive: true, billingStatus: "ACTIVE", monthlyPrice: 40000, trialEndsAt: null, subscriptionStartedAt: d(2026, 6, 1) };

test("suspender y reactivar", () => {
  const s = planClinicAction(active, { action: "suspend" }, now);
  assert.ok(s.ok && s.data.isActive === false);
  assert.equal(planClinicAction({ ...active, isActive: false }, { action: "suspend" }, now).ok, false);
  const r = planClinicAction({ ...active, isActive: false }, { action: "reactivate" }, now);
  assert.ok(r.ok && r.data.isActive === true);
  assert.equal(planClinicAction(active, { action: "reactivate" }, now).ok, false);
});

test("extender prueba suma dias al fin vigente; si ya vencio, desde hoy", () => {
  const a = planClinicAction(trial, { action: "extend_trial", days: 7 }, now);
  assert.ok(a.ok && a.data.trialEndsAt?.getTime() === d(2026, 11, 10).getTime());
  const b = planClinicAction({ ...trial, trialEndsAt: d(2026, 10, 1) }, { action: "extend_trial", days: 10 }, now);
  assert.ok(b.ok && b.data.trialEndsAt?.getTime() === now.getTime() + 10 * 86_400_000);
  assert.equal(planClinicAction(active, { action: "extend_trial", days: 5 }, now).ok, false);
});

test("terminar prueba: convertir exige precio; cancelar quita acceso", () => {
  const ok = planClinicAction(trial, { action: "end_trial", outcome: "convert" }, now);
  assert.ok(ok.ok && ok.data.billingStatus === "ACTIVE" && ok.data.subscriptionStartedAt === now && ok.data.trialEndsAt === null);
  assert.equal(planClinicAction({ ...trial, monthlyPrice: null }, { action: "end_trial", outcome: "convert" }, now).ok, false);
  const c = planClinicAction(trial, { action: "end_trial", outcome: "cancel" }, now);
  assert.ok(c.ok && c.data.billingStatus === "CANCELED" && c.data.isActive === false && c.data.canceledAt === now);
});

test("morosa, pagada y cancelada", () => {
  assert.ok(planClinicAction(active, { action: "mark_past_due" }, now).ok);
  assert.equal(planClinicAction(trial, { action: "mark_past_due" }, now).ok, false);
  const pd = { ...active, billingStatus: "PAST_DUE" as const };
  assert.ok(planClinicAction(pd, { action: "mark_paid" }, now).ok);
  assert.equal(planClinicAction(active, { action: "mark_paid" }, now).ok, false);
  const c = planClinicAction(pd, { action: "cancel" }, now);
  assert.ok(c.ok && c.data.isActive === false && c.data.billingStatus === "CANCELED");
  const canceled = { ...active, billingStatus: "CANCELED" as const, isActive: false };
  assert.equal(planClinicAction(canceled, { action: "cancel" }, now).ok, false);
  const back = planClinicAction(canceled, { action: "reactivate" }, now);
  assert.ok(back.ok && back.data.billingStatus === "ACTIVE" && back.data.canceledAt === null && back.data.isActive === true);
});

test("el esquema de acciones rechaza lo desconocido y dias fuera de rango", () => {
  assert.equal(clinicActionSchema.safeParse({ action: "delete" }).success, false);
  assert.equal(clinicActionSchema.safeParse({ action: "extend_trial", days: 0 }).success, false);
  assert.equal(clinicActionSchema.safeParse({ action: "extend_trial", days: 91 }).success, false);
  assert.equal(clinicActionSchema.safeParse({ action: "extend_trial", days: 14 }).success, true);
});
