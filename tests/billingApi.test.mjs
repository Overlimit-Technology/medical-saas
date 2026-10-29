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

test("super admin: 200 con las cifras del seed", async () => {
  const res = await get(await login("admin.seed@medigest.test"));
  assert.equal(res.status, 200);
  const { data } = await res.json();
  assert.equal(data.mrr, 260000);
  assert.equal(data.arr, 3120000);
  assert.equal(data.payingClinics, 4);
  assert.equal(data.arpa, 65000);
  assert.equal(data.pastDueClinics, 1);
  assert.equal(data.currentMonth.churnRate, 0);
  assert.equal(data.months[4].churnRate, 0.25);
  assert.equal(data.currentMonth.costs, 45000);
  assert.equal(data.currentMonth.margin, 215000);
});
