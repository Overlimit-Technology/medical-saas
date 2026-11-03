// Ejecutar: npm run test:dashboard:period
// Periodos y catalogo del panel personalizable del admin. Fecha fija: lunes 2-nov-2026.
import assert from "node:assert/strict";
import test from "node:test";
import { bucketIndex, resolvePeriod } from "../src/lib/dashboard/period";
import { DEFAULT_LAYOUT, METRICS, chartsFor, clampSpan, layoutSchema, newWidget, normalizeWidget, readLayout, spanFits } from "../src/lib/dashboard/catalog";

const today = "2026-11-02";

test("semana: de lunes a domingo, con 7 tramos y la semana anterior", () => {
  const r = resolvePeriod("week", 0, today);
  assert.equal(r.start, "2026-11-02");
  assert.equal(r.end, "2026-11-09");
  assert.equal(r.prevStart, "2026-10-26");
  assert.equal(r.prevEnd, "2026-11-02");
  assert.equal(r.buckets.length, 7);
  assert.equal(r.buckets[0].label, "Lun 2");
  assert.equal(r.label, "Semana del 2 nov al 8 nov 2026");
});

test("semana que cruza el año", () => {
  const r = resolvePeriod("week", 0, "2027-01-01");
  assert.equal(r.start, "2026-12-28");
  assert.equal(r.end, "2027-01-04");
});

test("mes: tramos diarios y mes anterior completo", () => {
  const r = resolvePeriod("month", 0, today);
  assert.equal(r.start, "2026-11-01");
  assert.equal(r.end, "2026-12-01");
  assert.equal(r.prevStart, "2026-10-01");
  assert.equal(r.buckets.length, 30);
  assert.equal(r.label, "Noviembre 2026");
});

test("mes movido hacia atras cruza de año", () => {
  const r = resolvePeriod("month", -11, today);
  assert.equal(r.start, "2025-12-01");
  assert.equal(r.end, "2026-01-01");
  assert.equal(r.label, "Diciembre 2025");
});

test("trimestre: tramos semanales sin pasarse del fin", () => {
  const r = resolvePeriod("quarter", 0, today);
  assert.equal(r.start, "2026-10-01");
  assert.equal(r.end, "2027-01-01");
  assert.equal(r.prevStart, "2026-07-01");
  assert.equal(r.label, "4.º trimestre 2026");
  assert.equal(r.buckets.length, 14);
  assert.equal(r.buckets[r.buckets.length - 1].end, "2027-01-01");
  // Los tramos se tocan sin huecos.
  r.buckets.slice(1).forEach((b, i) => assert.equal(b.start, r.buckets[i].end));
});

test("semestre y año: tramos mensuales", () => {
  const s = resolvePeriod("semester", 0, today);
  assert.equal(s.start, "2026-07-01");
  assert.equal(s.end, "2027-01-01");
  assert.equal(s.prevStart, "2026-01-01");
  assert.equal(s.buckets.map((b) => b.label).join(","), "Jul,Ago,Sep,Oct,Nov,Dic");
  assert.equal(s.label, "2.º semestre 2026");

  const y = resolvePeriod("year", -1, today);
  assert.equal(y.start, "2025-01-01");
  assert.equal(y.end, "2026-01-01");
  assert.equal(y.buckets.length, 12);
  assert.equal(y.label, "2025");
});

test("el desplazamiento se limita", () => {
  assert.equal(resolvePeriod("month", -999, today).offset, -36);
  assert.equal(resolvePeriod("month", Number.NaN, today).offset, 0);
});

test("bucketIndex ubica la fecha en su tramo", () => {
  const r = resolvePeriod("year", 0, today);
  assert.equal(bucketIndex(r.buckets, "2026-01-01"), 0);
  assert.equal(bucketIndex(r.buckets, "2026-11-30"), 10);
  assert.equal(bucketIndex(r.buckets, "2027-01-01"), -1);
});

test("catalogo: cada metrica tiene un grafico por defecto valido y ids unicos", () => {
  const ids = new Set<string>();
  for (const def of METRICS) {
    assert.ok(!ids.has(def.id), `id repetido: ${def.id}`);
    ids.add(def.id);
    assert.ok(chartsFor(def).includes(def.defaultChart), `${def.id} no admite ${def.defaultChart}`);
  }
});

test("el diseño por defecto es valido y respeta los minimos", () => {
  assert.ok(layoutSchema.safeParse(DEFAULT_LAYOUT).success);
  for (const w of DEFAULT_LAYOUT.widgets) {
    assert.deepEqual(normalizeWidget(w), w, `${w.id} no cumple los minimos`);
  }
});

test("normalizeWidget corrige grafico no admitido y un tamaño fuera de la grilla", () => {
  const w = normalizeWidget({ ...newWidget("agenda_today"), chart: "donut", w: 9, h: 0, goal: 5 });
  assert.equal(w.chart, "list");
  assert.equal(w.w, 4);
  assert.equal(w.h, 1);
  assert.ok(spanFits(w.chart, w));
  assert.equal(w.goal, null);
});

test("el tamaño es libre en celdas enteras: 3x2 y 1x3 se respetan", () => {
  assert.deepEqual(clampSpan("area", { w: 3, h: 2 }), { w: 3, h: 2 });
  assert.deepEqual(clampSpan("kpi", { w: 1, h: 3 }), { w: 1, h: 3 });
  assert.deepEqual(clampSpan("list", { w: 1, h: 1 }), { w: 2, h: 2 }, "un grafico no queda en una sola celda");
  assert.deepEqual(clampSpan("kpi", { w: 2.6, h: 1.2 }), { w: 3, h: 1 }, "se engancha a la celda mas cercana");
});

test("cada widget nuevo entra con un tamaño que su grafico admite", () => {
  for (const def of METRICS) {
    const w = newWidget(def.id);
    assert.ok(spanFits(w.chart, w), `${def.id}: ${w.chart} no cabe en ${w.w}x${w.h}`);
  }
});

test("readLayout convierte los diseños de 12 columnas (v1) y de tamaños fijos (v2)", () => {
  const v1 = readLayout({
    version: 1,
    period: "week",
    widgets: [
      { id: "a", metric: "appointments", chart: "spark", w: 3, h: 2, period: null, title: null, goal: null },
      { id: "b", metric: "appointments", chart: "area", w: 12, h: 4, period: null, title: null, goal: null },
      { id: "c", metric: "appointments_by_status", chart: "donut", w: 9, h: 4, period: null, title: null, goal: null },
      { id: "d", metric: "no_existe", chart: "kpi", w: 3, h: 2, period: null, title: null, goal: null },
    ],
  })!;
  assert.equal(v1.version, 3);
  assert.equal(v1.period, "week");
  assert.deepEqual(v1.widgets.map((w) => [w.id, w.w, w.h]), [["a", 1, 1], ["b", 4, 2], ["c", 3, 2]]);

  const v2 = readLayout({
    version: 2,
    period: "month",
    widgets: [{ id: "e", metric: "revenue", chart: "spark", size: "full", period: null, title: null, goal: null }],
  })!;
  assert.deepEqual(v2.widgets.map((w) => [w.id, w.w, w.h]), [["e", 4, 1]]);
});

test("layoutSchema rechaza metricas desconocidas", () => {
  const bad = { ...DEFAULT_LAYOUT, widgets: [{ ...DEFAULT_LAYOUT.widgets[0], metric: "no_existe" }] };
  assert.equal(layoutSchema.safeParse(bad).success, false);
});

test("pack: un widget con celda fija queda ahi y los demas fluyen alrededor", async () => {
  const { pack } = await import("../src/lib/dashboard/pack");
  const out = pack(
    [
      { id: "a", w: 1, h: 1 },
      { id: "b", w: 2, h: 2 },
      { id: "c", w: 1, h: 1, x: 0, y: 1 },
      { id: "d", w: 4, h: 1 },
    ],
    4
  );
  assert.deepEqual(out.get("c"), { x: 0, y: 1, w: 1, h: 1 });
  assert.deepEqual(out.get("a"), { x: 0, y: 0, w: 1, h: 1 });
  assert.deepEqual(out.get("b"), { x: 1, y: 0, w: 2, h: 2 });
  assert.deepEqual(out.get("d"), { x: 0, y: 2, w: 4, h: 1 });
});

test("pack: con 2 columnas se ignoran las celdas fijas y 3 o 4 columnas llenan la fila", async () => {
  const { pack } = await import("../src/lib/dashboard/pack");
  const out = pack([{ id: "a", w: 1, h: 1, x: 3, y: 5 }, { id: "b", w: 3, h: 2 }], 2);
  assert.deepEqual(out.get("a"), { x: 0, y: 0, w: 1, h: 1 });
  assert.deepEqual(out.get("b"), { x: 0, y: 1, w: 2, h: 2 });
});

test("largestHole: encuentra el espacio en blanco mas grande bajo el puntero", async () => {
  const { largestHole, occupied } = await import("../src/lib/dashboard/pack");
  // Fila 0 llena; en la fila 1 solo la columna 0 ocupada; fila 2 llena.
  const { taken, rows } = occupied([
    { x: 0, y: 0, w: 4, h: 1 },
    { x: 0, y: 1, w: 1, h: 1 },
    { x: 0, y: 2, w: 4, h: 1 },
  ]);
  assert.deepEqual(largestHole(taken, rows, 4, 2, 1), { x: 1, y: 1, w: 3, h: 1 });
  assert.equal(largestHole(taken, rows, 4, 0, 1), null, "una celda ocupada no es hueco");
  assert.equal(largestHole(taken, rows, 4, 1, 5), null, "bajo el ultimo widget no hay hueco");
});

test("herramientas: archivos y acceso directo, con su grafico y tamaño", () => {
  const files = newWidget("files");
  assert.equal(files.chart, "files");
  assert.deepEqual({ w: files.w, h: files.h }, { w: 2, h: 2 });
  const shortcut = newWidget("shortcut");
  assert.equal(shortcut.chart, "shortcut");
  assert.ok(spanFits("shortcut", { w: 1, h: 1 }), "el acceso directo cabe en 1x1");
  assert.deepEqual(clampSpan("files", { w: 1, h: 1 }), { w: 2, h: 2 }, "archivos necesita mas espacio");
});

test("icono, archivos y enlace se guardan y se leen; lo invalido se descarta", () => {
  const base = { ...newWidget("shortcut"), id: "s1", icon: { name: "calendar-check", color: "ambar", size: "lg" }, link: { href: "/agenda", label: "Agenda" } };
  const stored = {
    id: "f1",
    name: "informe.pdf",
    mime: "application/pdf",
    size: 2048,
    url: "/api/dashboard/files/abc.pdf",
    storage: "local",
    key: "abc.pdf",
    uploadedAt: "2026-11-03T10:00:00.000Z",
  };
  const files = { ...newWidget("files"), id: "f", files: [stored] };
  const layout = readLayout({ version: 3, period: "month", widgets: [base, files] });
  assert.equal(layout?.widgets[0].icon?.name, "calendar-check");
  assert.equal(layout?.widgets[0].link?.href, "/agenda");
  assert.equal(layout?.widgets[1].files?.[0].name, "informe.pdf");
  assert.ok(layoutSchema.safeParse(layout).success);

  assert.equal(layoutSchema.safeParse({ ...layout, widgets: [{ ...base, icon: { name: "<script>", color: "ambar", size: "lg" } }] }).success, false, "nombre de icono raro");
  assert.equal(layoutSchema.safeParse({ ...layout, widgets: [{ ...base, icon: { name: "star", color: "violeta", size: "lg" } }] }).success, false, "solo colores de Zensya");
  assert.equal(layoutSchema.safeParse({ ...layout, widgets: [{ ...base, link: { href: "https://otro.sitio", label: "x" } }] }).success, false, "solo rutas de la app");
  assert.equal(layoutSchema.safeParse({ ...layout, widgets: [{ ...files, files: [{ ...stored, size: 50 * 1024 * 1024 }] }] }).success, false, "archivo sobre el limite");
});

test("subida: tipos permitidos, tamaño maximo y mensajes claros", async () => {
  const { validateUpload } = await import("../src/server/dashboard/dashboardFiles");
  assert.equal(validateUpload("foto.JPG", "image/jpeg", 1000), null);
  assert.equal(validateUpload("planilla.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1000), null);
  assert.equal(validateUpload("datos.csv", "", 1000), null, "sin tipo informado se confia en la extension");
  assert.match(validateUpload("virus.exe", "application/x-msdownload", 1000) ?? "", /No se pueden subir archivos \.exe/);
  assert.match(validateUpload("grande.pdf", "application/pdf", 11 * 1024 * 1024) ?? "", /El máximo es 10 MB/);
  assert.match(validateUpload("falso.png", "application/pdf", 1000) ?? "", /no coincide/);
  assert.match(validateUpload("vacio.pdf", "application/pdf", 0) ?? "", /vacío/);
});
