// Prueba de la ruta contra un servidor local ya levantado (BASE_URL, por defecto http://localhost:3013)
// con la base sembrada (npm run seed:test). Ejecutar: npm run test:billing:api
import assert from "node:assert/strict";
import test from "node:test";

const BASE = process.env.BASE_URL ?? "http://localhost:3013";
const PASSWORD = "Test1234!"; // clave de las cuentas de prueba (docs/CUENTAS-DE-PRUEBA.md)

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  return cookies.join("; ");
}

const get = (cookie) =>
  fetch(`${BASE}/api/super-admin/billing-metrics`, { headers: cookie ? { cookie } : {}, redirect: "manual" });

test("sin sesion: 401", async () => {
  assert.equal((await get()).status, 401);
});

for (const email of ["admin.sede.test@medigest.test", "doctor.general.seed@medigest.test", "secretaria.centro.seed@medigest.test"]) {
  test(`${email} (no super admin): 403 y sin datos`, async () => {
    const res = await get(await login(email));
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.data, undefined);
  });
}

// Las cifras exactas de test-seed-billing.sql (MRR 260.000, etc.) cambian al cargar tambien
// test-seed-dashboard.sql, que agrega mas sedes. Aqui se comprueba la coherencia interna y las sedes del seed de facturacion.
test("super admin: 200 con cifras coherentes y las sedes del seed de facturacion", async () => {
  const res = await get(await login("admin.seed@medigest.test"));
  assert.equal(res.status, 200);
  const { data } = await res.json();
  const paying = data.clinics.filter((c) => c.paying);
  assert.equal(data.mrr, paying.reduce((s, c) => s + c.monthlyPrice, 0));
  assert.equal(data.arr, data.mrr * 12);
  assert.equal(data.payingClinics, paying.length);
  assert.equal(data.arpa, Math.round(data.mrr / paying.length));
  assert.equal(data.currentMonth.mrr, data.mrr);
  assert.equal(data.currentMonth.margin, data.currentMonth.mrr - data.currentMonth.costs);

  const byId = Object.fromEntries(data.clinics.map((c) => [c.id, c]));
  assert.equal(byId.seed_cm_clinic_centro.monthlyPrice, 90000);
  assert.equal(byId.seed_cm_clinic_norte.status, "PAST_DUE");
  assert.equal(byId.seed_cm_clinic_laboratorio.status, "CANCELED");
  assert.equal(byId.seed_billing_clinic_c.status, "TRIAL");
  assert.ok(data.pastDueClinics >= 1 && data.canceledClinics >= 1 && data.trialsExpiringSoon >= 1);
});
