// Pruebas HTTP del dashboard del super admin contra un servidor local ya levantado (BASE_URL, por defecto
// http://localhost:3013) con la base sembrada (npm run seed:test). Ejecutar: npm run test:dashboard:api
//
// Las pruebas que crean datos usan sedes "Test Dashboard ..." y las borran al final directamente en la base
// local (solo si DATABASE_URL apunta a localhost). La prueba de suspension suspende y reactiva la sede Centro del seed.
import "dotenv/config";
import assert from "node:assert/strict";
import test, { after } from "node:test";
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3013";
const PASSWORD = "Test1234!"; // clave de las cuentas de prueba (docs/CUENTAS-DE-PRUEBA.md)
const SUPER = "admin.seed@medigest.test";
const NON_SUPER = ["admin.sede.test@medigest.test", "doctor.general.seed@medigest.test", "secretaria.centro.seed@medigest.test"];

async function login(email, password = PASSWORD) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  const body = await res.json();
  return { cookie: res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; "), user: body.user };
}

function call(cookie, method, path, json) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(json !== undefined ? { "content-type": "application/json" } : {}) },
    body: json === undefined ? undefined : JSON.stringify(json),
    redirect: "manual",
  });
}

// Todas las rutas nuevas con un cuerpo valido, para comprobar que sin permiso ninguna hace nada.
const ROUTES = [
  ["GET", "/api/super-admin/dashboard"],
  ["POST", "/api/super-admin/clinics", {
    name: "Test Dashboard Intruso", city: "Nada", billingStatus: "TRIAL", trialDays: 14,
    admin: { email: "intruso.dashboard@medigest.test", firstName: "I", lastName: "N" },
  }],
  ["GET", "/api/super-admin/clinics/seed_cm_clinic_centro"],
  ["PATCH", "/api/super-admin/clinics/seed_cm_clinic_centro", { name: "Hackeada" }],
  ["POST", "/api/super-admin/clinics/seed_cm_clinic_centro/action", { action: "suspend" }],
  ["GET", "/api/super-admin/platform-costs"],
  ["POST", "/api/super-admin/platform-costs", { month: "2026-10", category: "Intruso", amount: 1 }],
  ["PATCH", "/api/super-admin/platform-costs/no-existe", { amount: 1 }],
  ["DELETE", "/api/super-admin/platform-costs/no-existe"],
];

test("sin sesion: 401 en cada ruta nueva", async () => {
  for (const [method, path, body] of ROUTES) {
    const res = await call(null, method, path, body);
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

for (const email of NON_SUPER) {
  test(`${email} (no super admin): 403 en cada ruta nueva y nada cambia`, async () => {
    const { cookie } = await login(email);
    for (const [method, path, body] of ROUTES) {
      const res = await call(cookie, method, path, body);
      assert.equal(res.status, 403, `${method} ${path}`);
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.data, undefined);
    }
    // La sede Centro sigue igual y no se creo la sede intrusa.
    const sa = await login(SUPER);
    const dash = await (await call(sa.cookie, "GET", "/api/super-admin/dashboard")).json();
    const names = dash.data.clinics.map((c) => c.name);
    assert.ok(names.includes("Seed CM - Sede Centro") || names.length > 0);
    assert.ok(!names.includes("Test Dashboard Intruso"));
    assert.ok(!names.includes("Hackeada"));
    assert.ok(dash.data.clinics.find((c) => c.id === "seed_cm_clinic_centro")?.isActive);
  });
}

test("super admin: dashboard con datos del seed y sin datos sensibles", async () => {
  const { cookie } = await login(SUPER);
  const res = await call(cookie, "GET", "/api/super-admin/dashboard?months=12");
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(!/passwordHash|\$2[aby]\$/.test(text), "no debe exponer hashes");
  const { data } = JSON.parse(text);
  assert.equal(data.months.length, 12);
  assert.ok(data.totals.allClinics >= 17);
  // Coherencia interna: el MRR es la suma de lo que pagan las sedes y el ARR es MRR x 12.
  const paying = data.clinics.filter((c) => c.paying);
  assert.equal(data.kpis.mrr, paying.reduce((s, c) => s + c.monthlyPrice, 0));
  assert.equal(data.kpis.arr, data.kpis.mrr * 12);
  assert.equal(data.kpis.payingClinics, paying.length);
  assert.equal(data.months[11].mrr, data.kpis.mrr);
  assert.equal(data.statusDistribution.reduce((s, x) => s + x.clinics, 0), data.totals.filteredClinics);
  assert.equal(data.planDistribution.reduce((s, p) => s + p.mrr, 0), data.kpis.mrr);
  assert.ok(data.kpis.appointmentsMonth > 0);
  assert.ok(data.options.plans.includes("Premium"));
  assert.ok(data.options.cities.includes("Temuco"));
});

test("super admin: filtros por rango, plan, estado, ciudad y nombre", async () => {
  const { cookie } = await login(SUPER);
  const get = async (qs) => (await (await call(cookie, "GET", `/api/super-admin/dashboard?${qs}`)).json()).data;

  assert.equal((await get("months=3")).months.length, 3);
  assert.equal((await get("")).months.length, 6);

  const trial = await get("status=TRIAL");
  assert.ok(trial.clinics.length >= 3 && trial.clinics.every((c) => c.billingStatus === "TRIAL"));
  assert.equal(trial.kpis.mrr, 0);

  const premium = await get("plan=Premium");
  assert.ok(premium.clinics.length >= 2 && premium.clinics.every((c) => c.plan === "Premium"));
  assert.equal(premium.kpis.margin, null);

  const susp = await get("status=SUSPENDED");
  assert.ok(susp.clinics.length >= 1 && susp.clinics.every((c) => c.isActive === false));

  const temuco = await get("city=Temuco");
  assert.ok(temuco.clinics.length >= 1 && temuco.clinics.every((c) => c.city === "Temuco"));

  const byName = await get("q=CLINICA%20la%20serena");
  assert.deepEqual(byName.clinics.map((c) => c.id), ["seed_dash_clinic_08"]);

  assert.equal((await get("q=zzzz-no-existe")).clinics.length, 0);
});

test("super admin: filtros invalidos responden 400", async () => {
  const { cookie } = await login(SUPER);
  for (const qs of ["months=7", "status=INVENTADO", "months=abc", `q=${"a".repeat(200)}`]) {
    assert.equal((await call(cookie, "GET", `/api/super-admin/dashboard?${qs}`)).status, 400, qs);
  }
});

test("super admin: no hay SQL inyectable en los filtros", async () => {
  const { cookie } = await login(SUPER);
  const evil = encodeURIComponent("'; DROP TABLE \"Clinic\"; --");
  const res = await call(cookie, "GET", `/api/super-admin/dashboard?q=${evil}&plan=${evil}&city=${evil}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.clinics.length, 0);
  assert.equal((await call(cookie, "GET", "/api/super-admin/dashboard")).status, 200);
});

// ---------- crear sede, acciones y auditoria ----------
const created = [];
const stamp = Date.now();

test("crear sede: valida, crea el ADMIN con clave temporal obligatoria y audita", async () => {
  const { cookie } = await login(SUPER);
  const body = {
    name: `Test Dashboard ${stamp}`,
    city: "Valdivia",
    planName: "Pro",
    monthlyPrice: 90000,
    billingStatus: "TRIAL",
    trialDays: 10,
    admin: { email: `test.dashboard.${stamp}@medigest.test`, firstName: "Ana", lastName: "Prueba" },
  };

  // Validaciones
  for (const bad of [
    { ...body, name: "A" },
    { ...body, monthlyPrice: -5 },
    { ...body, billingStatus: "CANCELED" },
    { ...body, trialDays: 500 },
    { ...body, admin: { ...body.admin, email: "no-es-correo" } },
    { ...body, extra: true },
    { ...body, billingStatus: "ACTIVE", monthlyPrice: null },
  ]) {
    assert.equal((await call(cookie, "POST", "/api/super-admin/clinics", bad)).status, 400);
  }

  const res = await call(cookie, "POST", "/api/super-admin/clinics", body);
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.ok(json.temporaryPassword && json.temporaryPassword.length >= 8);
  assert.ok(!JSON.stringify(json).includes("passwordHash"));
  created.push(json.clinic.id);

  // Duplicados
  assert.equal((await call(cookie, "POST", "/api/super-admin/clinics", body)).status, 409);
  assert.equal((await call(cookie, "POST", "/api/super-admin/clinics", { ...body, name: `Otra ${stamp}` })).status, 409);

  // El ADMIN puede entrar con la clave temporal, pero esta obligado a cambiarla.
  const admin = await login(body.admin.email, json.temporaryPassword);
  assert.equal(admin.user.mustChangePassword, true);
  assert.equal(admin.user.isSuperAdmin ?? false, false);
  // Y no puede usar las rutas del super admin.
  assert.equal((await call(admin.cookie, "GET", "/api/super-admin/dashboard")).status, 403);

  // Aparece en el dashboard como prueba de 10 dias.
  const dash = (await (await call(cookie, "GET", `/api/super-admin/dashboard?q=${encodeURIComponent(body.name)}`)).json()).data;
  assert.equal(dash.clinics.length, 1);
  assert.equal(dash.clinics[0].billingStatus, "TRIAL");
  assert.ok(dash.clinics[0].trialDaysLeft >= 9 && dash.clinics[0].trialDaysLeft <= 10);

  const detail = await (await call(cookie, "GET", `/api/super-admin/clinics/${json.clinic.id}`)).json();
  assert.equal(detail.users.length, 1);
  assert.ok(detail.history.some((h) => h.event === "SUPERADMIN_CLINIC_CREATE" && h.author === SUPER));
  assert.ok(!JSON.stringify(detail).includes("passwordHash"));
});

test("acciones sobre una sede: reglas, validacion y auditoria", async () => {
  const { cookie } = await login(SUPER);
  const id = created[0];
  assert.ok(id, "requiere la prueba anterior");
  const act = (b) => call(cookie, "POST", `/api/super-admin/clinics/${id}/action`, b);

  // Entradas invalidas
  assert.equal((await act({ action: "delete" })).status, 400);
  assert.equal((await act({ action: "extend_trial", days: 0 })).status, 400);
  assert.equal((await act({})).status, 400);
  assert.equal((await call(cookie, "POST", "/api/super-admin/clinics/no-existe/action", { action: "suspend" })).status, 404);

  // Extender prueba
  const before = (await (await call(cookie, "GET", `/api/super-admin/clinics/${id}`)).json()).clinic.trialEndsAt;
  assert.equal((await act({ action: "extend_trial", days: 5 })).status, 200);
  const after = (await (await call(cookie, "GET", `/api/super-admin/clinics/${id}`)).json()).clinic.trialEndsAt;
  assert.equal(new Date(after).getTime() - new Date(before).getTime(), 5 * 86_400_000);

  // Reglas de estado
  assert.equal((await act({ action: "mark_past_due" })).status, 409);
  assert.equal((await act({ action: "reactivate" })).status, 409);
  assert.equal((await act({ action: "suspend" })).status, 200);
  assert.equal((await act({ action: "suspend" })).status, 409);
  assert.equal((await act({ action: "reactivate" })).status, 200);

  // Convertir la prueba: pasa a activa y cuenta en el MRR
  assert.equal((await act({ action: "end_trial", outcome: "convert" })).status, 200);
  let row = (await (await call(cookie, "GET", `/api/super-admin/dashboard?q=Test%20Dashboard%20${stamp}`)).json()).data.clinics[0];
  assert.equal(row.billingStatus, "ACTIVE");
  assert.equal(row.paying, true);
  assert.equal(row.monthlyPrice, 90000);

  // Morosa -> pagada -> cancelada (pierde acceso) -> reactivada
  assert.equal((await act({ action: "mark_past_due" })).status, 200);
  assert.equal((await act({ action: "mark_paid" })).status, 200);
  assert.equal((await act({ action: "cancel" })).status, 200);
  row = (await (await call(cookie, "GET", `/api/super-admin/dashboard?q=Test%20Dashboard%20${stamp}`)).json()).data.clinics[0];
  assert.equal(row.billingStatus, "CANCELED");
  assert.equal(row.isActive, false);
  assert.equal((await act({ action: "reactivate" })).status, 200);

  // Edicion de plan, precio y nombre
  const patch = (b) => call(cookie, "PATCH", `/api/super-admin/clinics/${id}`, b);
  assert.equal((await patch({ monthlyPrice: -1 })).status, 400);
  assert.equal((await patch({ isActive: false })).status, 400); // campo que no se puede editar por aqui
  assert.equal((await patch({ billingStatus: "ACTIVE" })).status, 400);
  assert.equal((await patch({})).status, 400);
  const ok = await patch({ planName: "Premium", monthlyPrice: 150000 });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).clinic.monthlyPrice, 150000);

  // Todo quedo en la auditoria
  const detail = await (await call(cookie, "GET", `/api/super-admin/clinics/${id}`)).json();
  const events = detail.history.map((h) => h.event);
  assert.ok(events.includes("SUPERADMIN_CLINIC_UPDATE"));
  assert.ok(events.includes("SUPERADMIN_CLINIC_CANCEL"));
  assert.ok(detail.history.every((h) => h.author === SUPER));
});

test("costos de plataforma: crear, editar, borrar y validar", async () => {
  const { cookie } = await login(SUPER);
  assert.equal((await call(cookie, "POST", "/api/super-admin/platform-costs", { month: "2026-13", category: "X", amount: 1 })).status, 400);
  assert.equal((await call(cookie, "POST", "/api/super-admin/platform-costs", { month: "2026-10", category: "X", amount: -1 })).status, 400);
  assert.equal((await call(cookie, "POST", "/api/super-admin/platform-costs", { month: "2026-10", category: "", amount: 1 })).status, 400);

  const res = await call(cookie, "POST", "/api/super-admin/platform-costs", { month: "2026-10", category: `Test ${stamp}`, amount: 1234 });
  assert.equal(res.status, 201);
  const { item } = await res.json();
  const list = await (await call(cookie, "GET", "/api/super-admin/platform-costs")).json();
  assert.ok(list.items.some((c) => c.id === item.id && c.amount === 1234));
  assert.equal((await call(cookie, "PATCH", `/api/super-admin/platform-costs/${item.id}`, { amount: 2000 })).status, 200);
  assert.equal((await call(cookie, "PATCH", `/api/super-admin/platform-costs/${item.id}`, { id: "x" })).status, 400);
  assert.equal((await call(cookie, "DELETE", `/api/super-admin/platform-costs/${item.id}`)).status, 200);
  assert.equal((await call(cookie, "DELETE", `/api/super-admin/platform-costs/${item.id}`)).status, 404);
});

test("suspender una sede corta de verdad el acceso de sus usuarios (y reactivar lo devuelve)", async () => {
  const sa = await login(SUPER);
  const admin = await login("admin.centro.test@medigest.test");
  const clinicId = "seed_cm_clinic_centro";

  const sel = await call(admin.cookie, "POST", "/api/clinics/select", { clinicId });
  assert.equal(sel.status, 200);
  // El navegador acumula las cookies; aqui las unimos a mano.
  const clinicCookie = sel.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const cookie = `${admin.cookie}; ${clinicCookie}`;

  assert.equal((await call(cookie, "GET", "/api/patients")).status, 200, "antes de suspender opera");
  try {
    assert.equal((await call(sa.cookie, "POST", `/api/super-admin/clinics/${clinicId}/action`, { action: "suspend" })).status, 200);
    const blocked = await call(cookie, "GET", "/api/patients");
    assert.notEqual(blocked.status, 200, "suspendida no debe operar");
    // Tampoco puede volver a elegirla.
    const again = await call(admin.cookie, "POST", "/api/clinics/select", { clinicId });
    assert.notEqual(again.status, 200);
  } finally {
    const back = await call(sa.cookie, "POST", `/api/super-admin/clinics/${clinicId}/action`, { action: "reactivate" });
    assert.ok([200, 409].includes(back.status));
  }
  assert.equal((await call(cookie, "GET", "/api/patients")).status, 200, "reactivada vuelve a operar");
});

after(async () => {
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).hostname !== "localhost") return; // nunca limpiar una base que no sea local
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DELETE FROM "User" WHERE email LIKE 'test.dashboard.%@medigest.test'`);
    await client.query(`DELETE FROM "Clinic" WHERE name LIKE 'Test Dashboard %'`);
    await client.query(`DELETE FROM "PlatformCost" WHERE category LIKE 'Test %'`);
  } finally {
    await client.end();
  }
});
