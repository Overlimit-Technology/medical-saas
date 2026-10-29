// Ejecutar: npm run test:billing
// Cifras calculadas a mano con la misma historia que prisma/test-seed-billing.sql.
// "Hoy" es fijo (29-oct-2026), asi el resultado no depende del reloj.
import assert from "node:assert/strict";
import test from "node:test";
import { computeBillingMetrics, type BillingClinicInput } from "../src/server/super-admin/billingMetricsCalc";

const now = new Date(2026, 9, 29, 12, 0, 0); // 29-oct-2026
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

function clinic(partial: Partial<BillingClinicInput> & { id: string }): BillingClinicInput {
  return {
    name: partial.id,
    isActive: true,
    billingStatus: "ACTIVE",
    planName: null,
    monthlyPrice: null,
    trialEndsAt: null,
    subscriptionStartedAt: null,
    canceledAt: null,
    ...partial,
  };
}

const clinics: BillingClinicInput[] = [
  clinic({ id: "centro", planName: "Pro", monthlyPrice: 90000, subscriptionStartedAt: d(2026, 5, 5) }),
  clinic({ id: "norte", planName: "Starter", monthlyPrice: 40000, billingStatus: "PAST_DUE", subscriptionStartedAt: d(2026, 7, 5) }),
  clinic({
    id: "lab",
    isActive: false,
    planName: "Pro",
    monthlyPrice: 90000,
    billingStatus: "CANCELED",
    subscriptionStartedAt: d(2026, 6, 5),
    canceledAt: d(2026, 9, 10),
  }),
  clinic({ id: "sur", planName: "Starter", monthlyPrice: 40000, subscriptionStartedAt: d(2026, 8, 5) }),
  clinic({ id: "oriente", planName: "Pro", monthlyPrice: 90000, subscriptionStartedAt: d(2026, 10, 1) }),
  clinic({ id: "trial", billingStatus: "TRIAL", trialEndsAt: d(2026, 11, 3) }),
];
const costs = [
  ...["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].flatMap((month) => [
    { month, category: "Infraestructura", amount: 25000 },
    { month, category: "IA", amount: 15000 },
  ]),
  { month: "2026-10", category: "Correo", amount: 5000 },
];

const m = computeBillingMetrics(clinics, costs, now);

test("MRR, ARR, ARPA y sedes que pagan", () => {
  // Pagan: centro 90.000 + norte 40.000 + sur 40.000 + oriente 90.000 = 260.000
  assert.equal(m.mrr, 260000);
  assert.equal(m.arr, 3120000);
  assert.equal(m.payingClinics, 4);
  assert.equal(m.arpa, 65000);
});

test("pago atrasado, trials y canceladas", () => {
  assert.equal(m.pastDueClinics, 1);
  assert.equal(m.mrrAtRisk, 40000);
  assert.equal(m.trialClinics, 1);
  assert.equal(m.trialsExpiringSoon, 1); // vence el 3-nov, dentro de 7 dias
  assert.equal(m.canceledClinics, 1);
});

test("serie de MRR de los ultimos 6 meses", () => {
  assert.deepEqual(m.months.map((x) => x.month), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  // may: centro | jun: +lab | jul: +norte | ago: +sur | sep: -lab | oct: +oriente
  assert.deepEqual(m.months.map((x) => x.mrr), [90000, 180000, 220000, 260000, 170000, 260000]);
  assert.deepEqual(m.months.map((x) => x.payingClinics), [1, 2, 3, 4, 3, 4]);
});

test("churn: septiembre 1 de 4 = 25%, octubre 0%", () => {
  const sep = m.months[4];
  assert.equal(sep.churnedClinics, 1);
  assert.equal(sep.churnedMrr, 90000);
  assert.equal(sep.churnRate, 0.25);
  const oct = m.months[5];
  assert.equal(oct.churnedClinics, 0);
  assert.equal(oct.churnRate, 0);
  assert.equal(m.months[0].churnRate, null); // sin sedes pagando antes de mayo
});

test("altas del mes", () => {
  assert.equal(m.currentMonth.newClinics, 1);
  assert.equal(m.currentMonth.newMrr, 90000);
});

test("costos y margen de octubre: 45.000 y 215.000 (82,7%)", () => {
  assert.equal(m.currentMonth.costs, 45000);
  assert.equal(m.currentMonth.margin, 215000);
  assert.equal(Math.round((m.currentMonth.marginPercent ?? 0) * 1000) / 10, 82.7);
  assert.equal(m.months[4].margin, 170000 - 40000);
  assert.deepEqual(m.costsByCategory, [
    { category: "Infraestructura", amount: 25000 },
    { category: "IA", amount: 15000 },
    { category: "Correo", amount: 5000 },
  ]);
});

test("desglose por plan", () => {
  assert.deepEqual(m.byPlan, [
    { plan: "Pro", clinics: 2, mrr: 180000 },
    { plan: "Starter", clinics: 2, mrr: 80000 },
  ]);
});

test("sin sedes: todo en cero y sin dividir por cero", () => {
  const e = computeBillingMetrics([], [], now);
  assert.equal(e.mrr, 0);
  assert.equal(e.arpa, null);
  assert.equal(e.currentMonth.marginPercent, null);
  assert.equal(e.currentMonth.churnRate, null);
});

test("una sede sin precio no cuenta como ingreso", () => {
  const r = computeBillingMetrics([clinic({ id: "x", subscriptionStartedAt: d(2026, 9, 1) })], [], now);
  assert.equal(r.mrr, 0);
  assert.equal(r.payingClinics, 0);
});
