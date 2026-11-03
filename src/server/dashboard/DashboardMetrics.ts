/**
 * Calculo de las metricas del panel personalizable (ver src/lib/dashboard/catalog.ts).
 * Cada fuente de datos se consulta una sola vez por pedido y por periodo (actual o anterior), y las
 * metricas que comparten fuente reutilizan el resultado. Todo filtra por la sede de la sesion.
 */
import { prisma } from "@/lib/prisma";
import { chileDateString, chileLocalToDate, formatChileTime, weekdayOf } from "@/lib/chileTime";
import { METRIC_BY_ID, isTool, type BreakdownItem, type ListRow, type MetricResult, type SeriesPoint } from "@/lib/dashboard/catalog";
import { bucketIndex, type PeriodRange } from "@/lib/dashboard/period";
import { VacationsService } from "@/server/vacations/VacationsService";

type Window = { from: Date; to: Date };
type Which = "cur" | "prev";

const HOUR = 3_600_000;
const num = (v: unknown) => Number(v ?? 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (n: number, d: number) => (d ? round1((n / d) * 100) : 0);
const fullName = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName} ${p.lastName}`.trim() : "");

const APPOINTMENT_STATUS: Record<string, { label: string; color: string; tone: "ok" | "warn" | "off" | "err" }> = {
  SCHEDULED: { label: "Agendada", color: "#e8a020", tone: "warn" },
  CONFIRMED: { label: "Confirmada", color: "#50c9d5", tone: "ok" },
  COMPLETED: { label: "Completada", color: "#1e737b", tone: "ok" },
  CANCELLED: { label: "Cancelada", color: "#c3ced6", tone: "off" },
  NO_SHOW: { label: "No asistió", color: "#e5484d", tone: "err" },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: "Pagada", color: "#1d9aa6" },
  PENDING: { label: "Pendiente", color: "#e8a020" },
  WAIVED: { label: "Exenta", color: "#c3ced6" },
};

const PLAN_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activo", color: "#1d9aa6" },
  COMPLETED: { label: "Completado", color: "#1e737b" },
  CANCELLED: { label: "Cancelado", color: "#c3ced6" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Por emitir", color: "#e8a020" },
  ISSUED: { label: "Emitida", color: "#2a78d6" },
  PAID: { label: "Pagada", color: "#1d9aa6" },
  CANCELLED: { label: "Anulada", color: "#c3ced6" },
};

const ALERT_TYPE: Record<string, string> = {
  APPOINTMENT_CREATED: "Citas nuevas",
  APPOINTMENT_RESCHEDULED: "Reagendamientos",
  APPOINTMENT_CANCELLED: "Cancelaciones",
  APPOINTMENT_CONFLICT: "Choques de agenda",
  PATIENT_ARRIVED: "Llegadas",
  PAYMENT_PENDING: "Cobros pendientes",
  CUSTOM: "Otras",
};

const TEMPERATURE: Record<string, string> = { HOT: "Caliente", WARM: "Tibio", COLD: "Frío" };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const AGE_GROUPS = ["0 a 17", "18 a 29", "30 a 44", "45 a 59", "60 o más", "Sin dato"];
const MAX_ITEMS = 8;

/** Suma por tramo del periodo. */
function bucketSeries<T>(range: PeriodRange, items: T[], date: (x: T) => Date, value: (x: T) => number = () => 1): SeriesPoint[] {
  const values = range.buckets.map(() => 0);
  for (const item of items) {
    const i = bucketIndex(range.buckets, chileDateString(date(item)));
    if (i >= 0) values[i] += value(item);
  }
  return range.buckets.map((b, i) => ({ label: b.label, value: round1(values[i]) }));
}

/** Porcentaje por tramo: num/den de los items de cada tramo. */
function rateSeries<T>(range: PeriodRange, items: T[], date: (x: T) => Date, isNum: (x: T) => boolean, isDen: (x: T) => boolean): SeriesPoint[] {
  const n = range.buckets.map(() => 0);
  const d = range.buckets.map(() => 0);
  for (const item of items) {
    const i = bucketIndex(range.buckets, chileDateString(date(item)));
    if (i < 0 || !isDen(item)) continue;
    d[i] += 1;
    if (isNum(item)) n[i] += 1;
  }
  return range.buckets.map((b, i) => ({ label: b.label, value: pct(n[i], d[i]) }));
}

/**
 * Reparto en categorias. Por defecto ordena de mayor a menor y junta lo que pase de 8 en "Otros".
 * Con `keepOrder` respeta el orden dado (estados, dias, tramos de edad) para que cada categoria
 * conserve su color aunque cambie el periodo.
 */
function breakdown(entries: Array<BreakdownItem>, opts: { keepOrder?: boolean; keepZeros?: boolean } = {}): MetricResult {
  let items = entries.filter((e) => opts.keepZeros || e.value > 0).map((e) => ({ ...e, value: round1(e.value) }));
  if (!opts.keepOrder) items.sort((a, b) => b.value - a.value);
  if (items.length > MAX_ITEMS) {
    const rest = items.slice(MAX_ITEMS - 1).reduce((acc, e) => acc + e.value, 0);
    items = [...items.slice(0, MAX_ITEMS - 1), { label: "Otros", value: round1(rest), color: "#a3b1bb" }];
  }
  return { shape: "breakdown", total: round1(items.reduce((acc, e) => acc + e.value, 0)), items };
}

function tally<T>(items: T[], key: (x: T) => string | null, value: (x: T) => number = () => 1) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    map.set(k, (map.get(k) ?? 0) + value(item));
  }
  return map;
}

function normalizeGender(raw: string | null) {
  const g = (raw ?? "").trim().toLowerCase();
  if (!g) return "Sin dato";
  if (g.startsWith("f") || g.startsWith("muj")) return "Femenino";
  if (g.startsWith("m") || g.startsWith("hom")) return "Masculino";
  return "Otro";
}

function ageGroup(birth: Date | null, today: string) {
  if (!birth) return "Sin dato";
  const [ty, tm, td] = today.split("-").map(Number);
  const [by, bm, bd] = chileDateString(birth).split("-").map(Number);
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  if (age < 18) return AGE_GROUPS[0];
  if (age < 30) return AGE_GROUPS[1];
  if (age < 45) return AGE_GROUPS[2];
  if (age < 60) return AGE_GROUPS[3];
  return AGE_GROUPS[4];
}

/** Meses YYYY-MM que se cruzan con el rango [start, end). */
function monthsIn(start: string, end: string) {
  const months: string[] = [];
  let [y, mo] = start.split("-").map(Number);
  for (;;) {
    const key = `${y}-${`${mo}`.padStart(2, "0")}`;
    if (`${key}-01` >= end) break;
    months.push(key);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return months;
}

export class DashboardMetrics {
  private cache = new Map<string, Promise<unknown>>();
  private readonly win: Record<Which, Window>;
  private readonly today: string;

  constructor(
    private readonly clinicId: string,
    private readonly range: PeriodRange,
    private readonly now: Date = new Date()
  ) {
    this.win = {
      cur: { from: chileLocalToDate(range.start, "00:00"), to: chileLocalToDate(range.end, "00:00") },
      prev: { from: chileLocalToDate(range.prevStart, "00:00"), to: chileLocalToDate(range.prevEnd, "00:00") },
    };
    this.today = chileDateString(now);
  }

  private load<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) this.cache.set(key, fn());
    return this.cache.get(key) as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Fuentes
  // -------------------------------------------------------------------------

  private appointments(w: Which) {
    return this.load(`appointments:${w}`, () =>
      prisma.appointment.findMany({
        where: { clinicId: this.clinicId, startAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: {
          startAt: true,
          endAt: true,
          status: true,
          paymentStatus: true,
          patientId: true,
          doctorId: true,
          boxId: true,
          arrivedAt: true,
          createdBy: true,
        },
      })
    );
  }

  private payments(w: Which) {
    return this.load(`payments:${w}`, () =>
      prisma.paymentHistory.findMany({
        where: {
          recordedAt: { gte: this.win[w].from, lt: this.win[w].to },
          patientTreatment: { patient: { clinicId: this.clinicId } },
        },
        select: {
          recordedAt: true,
          status: true,
          amount: true,
          patientTreatment: { select: { treatment: { select: { name: true } } } },
          appointment: { select: { doctorId: true } },
        },
      })
    );
  }

  private cash(w: Which) {
    return this.load(`cash:${w}`, () =>
      prisma.cashMovement.findMany({
        where: { clinicId: this.clinicId, recordedAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { type: true, amount: true, recordedAt: true },
      })
    );
  }

  private leads(w: Which) {
    return this.load(`leads:${w}`, () =>
      prisma.crmLead.findMany({
        where: { clinicId: this.clinicId, createdAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { createdAt: true, channel: true, converted: true },
      })
    );
  }

  private messages(w: Which) {
    return this.load(`messages:${w}`, () =>
      prisma.crmLeadMessage.findMany({
        where: { lead: { clinicId: this.clinicId }, createdAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { createdAt: true, direction: true },
      })
    );
  }

  private performed(w: Which) {
    return this.load(`performed:${w}`, () =>
      prisma.patientTreatment.findMany({
        where: { patient: { clinicId: this.clinicId }, performedAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { performedAt: true, treatment: { select: { name: true, fonasaCode: true } } },
      })
    );
  }

  private plans(w: Which) {
    return this.load(`plans:${w}`, () =>
      prisma.treatmentPlan.findMany({
        where: { clinicId: this.clinicId, createdAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { createdAt: true, status: true },
      })
    );
  }

  private imaging(w: Which) {
    return this.load(`imaging:${w}`, () =>
      prisma.patientImaging.findMany({
        where: { clinicId: this.clinicId, studiedAt: { gte: this.win[w].from, lt: this.win[w].to } },
        select: { studiedAt: true, status: true },
      })
    );
  }

  private invoices(w: Which) {
    const [start, end] = w === "cur" ? [this.range.start, this.range.end] : [this.range.prevStart, this.range.prevEnd];
    return this.load(`invoices:${w}`, () =>
      prisma.professionalInvoice.findMany({
        where: { clinicId: this.clinicId, month: { in: monthsIn(start, end) } },
        select: { month: true, status: true, netAmount: true },
      })
    );
  }

  /** Fechas de creacion de una tabla con clinicId y createdAt (o el campo de fecha que se indique). */
  private dates(model: "patient" | "clinicalVisit" | "clinicalRecord" | "observation" | "patientAccount", w: Which) {
    const where = { clinicId: this.clinicId };
    const window = { gte: this.win[w].from, lt: this.win[w].to };
    return this.load(`${model}:${w}`, async (): Promise<Date[]> => {
      switch (model) {
        case "patient":
          return (await prisma.patient.findMany({ where: { ...where, createdAt: window }, select: { createdAt: true } })).map((r) => r.createdAt);
        case "clinicalVisit":
          return (await prisma.clinicalVisit.findMany({ where: { ...where, startedAt: window }, select: { startedAt: true } })).map((r) => r.startedAt);
        case "clinicalRecord":
          return (await prisma.clinicalRecord.findMany({ where: { ...where, createdAt: window }, select: { createdAt: true } })).map((r) => r.createdAt);
        case "observation":
          return (await prisma.observation.findMany({ where: { ...where, effectiveAt: window }, select: { effectiveAt: true } })).map((r) => r.effectiveAt);
        case "patientAccount":
          return (await prisma.patientAccount.findMany({ where: { ...where, createdAt: window }, select: { createdAt: true } })).map((r) => r.createdAt);
      }
    });
  }

  private userNames(ids: string[]) {
    const unique = Array.from(new Set(ids)).sort();
    return this.load(`users:${unique.join(",")}`, async () => {
      const users = unique.length
        ? await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, profile: { select: { firstName: true, lastName: true } } } })
        : [];
      return new Map(users.map((u) => [u.id, fullName(u.profile) || "Profesional"]));
    });
  }

  // -------------------------------------------------------------------------
  // Formas comunes
  // -------------------------------------------------------------------------

  private async countTrend<T>(src: (w: Which) => Promise<T[]>, date: (x: T) => Date, keep: (x: T) => boolean = () => true, value: (x: T) => number = () => 1): Promise<MetricResult> {
    const [cur, prev] = await Promise.all([src.call(this, "cur"), src.call(this, "prev")]);
    const sum = (rows: T[]) => round1(rows.filter(keep).reduce((acc, x) => acc + value(x), 0));
    return { shape: "trend", value: sum(cur), previous: sum(prev), series: bucketSeries(this.range, cur.filter(keep), date, value) };
  }

  private async rateTrend<T>(src: (w: Which) => Promise<T[]>, date: (x: T) => Date, isNum: (x: T) => boolean, isDen: (x: T) => boolean): Promise<MetricResult> {
    const [cur, prev] = await Promise.all([src.call(this, "cur"), src.call(this, "prev")]);
    const rate = (rows: T[]) => {
      const den = rows.filter(isDen);
      return den.length ? pct(den.filter(isNum).length, den.length) : 0;
    };
    const prevDen = prev.filter(isDen).length;
    return { shape: "trend", value: rate(cur), previous: prevDen ? rate(prev) : null, series: rateSeries(this.range, cur, date, isNum, isDen) };
  }

  /** Promedio por tramo (ticket promedio, atraso de llegada). */
  private async avgTrend<T>(src: (w: Which) => Promise<T[]>, date: (x: T) => Date, keep: (x: T) => boolean, value: (x: T) => number): Promise<MetricResult> {
    const [cur, prev] = await Promise.all([src.call(this, "cur"), src.call(this, "prev")]);
    const avg = (rows: T[]) => {
      const k = rows.filter(keep);
      return k.length ? round1(k.reduce((acc, x) => acc + value(x), 0) / k.length) : 0;
    };
    const kept = cur.filter(keep);
    const sums = bucketSeries(this.range, kept, date, value);
    const counts = bucketSeries(this.range, kept, date);
    return {
      shape: "trend",
      value: avg(cur),
      previous: prev.some(keep) ? avg(prev) : null,
      series: sums.map((s, i) => ({ label: s.label, value: counts[i].value ? round1(s.value / counts[i].value) : 0 })),
    };
  }

  // -------------------------------------------------------------------------
  // Metricas
  // -------------------------------------------------------------------------

  async compute(id: string): Promise<MetricResult> {
    const notCancelled = (a: { status: string }) => a.status !== "CANCELLED";
    const startAt = (a: { startAt: Date }) => a.startAt;
    const isPast = (a: { startAt: Date }) => a.startAt < this.now;

    switch (id) {
      // Agenda
      case "appointments":
        return this.countTrend(this.appointments, startAt, notCancelled);
      case "appointments_completed":
        return this.countTrend(this.appointments, startAt, (a) => a.status === "COMPLETED");
      case "attendance_rate":
        return this.rateTrend(this.appointments, startAt, (a) => a.status === "COMPLETED", (a) => a.status === "COMPLETED" || a.status === "NO_SHOW");
      case "no_show_rate":
        return this.rateTrend(this.appointments, startAt, (a) => a.status === "NO_SHOW", (a) => notCancelled(a) && isPast(a));
      case "cancellation_rate":
        return this.rateTrend(this.appointments, startAt, (a) => a.status === "CANCELLED", () => true);
      case "confirmation_rate":
        return this.rateTrend(this.appointments, startAt, (a) => a.status === "CONFIRMED" || a.status === "COMPLETED", notCancelled);
      case "online_bookings":
        return this.countTrend(this.appointments, startAt, (a) => a.createdBy === null);
      case "appointments_by_status": {
        const counts = tally(await this.appointments("cur"), (a) => a.status);
        return breakdown(
          Object.entries(APPOINTMENT_STATUS).map(([key, s]) => ({ label: s.label, value: counts.get(key) ?? 0, color: s.color })),
          { keepOrder: true }
        );
      }
      case "appointments_by_source": {
        const rows = (await this.appointments("cur")).filter(notCancelled);
        const online = rows.filter((a) => a.createdBy === null).length;
        return breakdown(
          [
            { label: "Equipo", value: rows.length - online },
            { label: "Reserva online", value: online },
          ],
          { keepOrder: true }
        );
      }
      case "appointments_by_doctor": {
        const rows = (await this.appointments("cur")).filter(notCancelled);
        const names = await this.userNames(rows.map((a) => a.doctorId));
        return breakdown(Array.from(tally(rows, (a) => a.doctorId), ([k, v]) => ({ label: names.get(k) ?? "Profesional", value: v })));
      }
      case "hours_by_box": {
        const [rows, boxes] = await Promise.all([
          this.appointments("cur"),
          this.load("boxes", () => prisma.box.findMany({ where: { clinicId: this.clinicId }, select: { id: true, name: true } })),
        ]);
        const names = new Map(boxes.map((b) => [b.id, b.name]));
        const hours = tally(rows.filter(notCancelled), (a) => a.boxId, (a) => (a.endAt.getTime() - a.startAt.getTime()) / HOUR);
        return breakdown(Array.from(hours, ([k, v]) => ({ label: names.get(k) ?? "Box", value: v })));
      }
      case "appointments_by_weekday": {
        const counts = tally((await this.appointments("cur")).filter(notCancelled), (a) => WEEKDAYS[(weekdayOf(chileDateString(a.startAt)) + 6) % 7]);
        return breakdown(WEEKDAYS.map((d) => ({ label: d, value: counts.get(d) ?? 0 })), { keepOrder: true, keepZeros: true });
      }
      case "appointments_by_hour": {
        const counts = tally((await this.appointments("cur")).filter(notCancelled), (a) => formatChileTime(a.startAt).slice(0, 2));
        const hours = Array.from(counts.keys()).map(Number);
        if (!hours.length) return breakdown([]);
        const items: BreakdownItem[] = [];
        for (let h = Math.min(...hours); h <= Math.max(...hours); h++) {
          const key = `${h}`.padStart(2, "0");
          items.push({ label: `${key}:00`, value: counts.get(key) ?? 0 });
        }
        // Las horas tienen orden propio, asi que no se juntan en "Otros".
        return { shape: "breakdown", total: items.reduce((a, i) => a + i.value, 0), items };
      }
      case "arrivals":
        return this.countTrend(this.appointments, startAt, (a) => a.arrivedAt !== null);
      case "arrival_delay":
        return this.avgTrend(
          this.appointments,
          startAt,
          (a) => a.arrivedAt !== null,
          (a) => Math.max(0, (a.arrivedAt!.getTime() - a.startAt.getTime()) / 60_000)
        );
      case "agenda_today":
        return this.agendaToday();

      // Pacientes
      case "new_patients":
        return this.countTrend((w) => this.dates("patient", w), (d) => d);
      case "active_patients":
        return { shape: "snapshot", value: await prisma.patient.count({ where: { clinicId: this.clinicId, isActive: true } }) };
      case "attended_patients":
        return this.attendedPatients(false);
      case "returning_rate":
        return this.attendedPatients(true);
      case "patients_by_gender":
      case "patients_by_age": {
        const patients = await this.load("activePatients", () =>
          prisma.patient.findMany({ where: { clinicId: this.clinicId, isActive: true }, select: { gender: true, birthDate: true } })
        );
        if (id === "patients_by_gender") {
          const counts = tally(patients, (p) => normalizeGender(p.gender));
          return breakdown(["Femenino", "Masculino", "Otro", "Sin dato"].map((g) => ({ label: g, value: counts.get(g) ?? 0 })), { keepOrder: true });
        }
        const counts = tally(patients, (p) => ageGroup(p.birthDate, this.today));
        return breakdown(AGE_GROUPS.map((g) => ({ label: g, value: counts.get(g) ?? 0 })), { keepOrder: true, keepZeros: true });
      }
      case "portal_accounts":
        return this.countTrend((w) => this.dates("patientAccount", w), (d) => d);

      // Finanzas
      case "revenue":
        return this.countTrend(this.payments, (p) => p.recordedAt, (p) => p.status === "PAID", (p) => num(p.amount));
      case "pending_payments":
        return this.countTrend(this.payments, (p) => p.recordedAt, (p) => p.status === "PENDING", (p) => num(p.amount));
      case "avg_ticket":
        return this.avgTrend(this.payments, (p) => p.recordedAt, (p) => p.status === "PAID", (p) => num(p.amount));
      case "revenue_by_treatment": {
        const paid = (await this.payments("cur")).filter((p) => p.status === "PAID");
        return breakdown(Array.from(tally(paid, (p) => p.patientTreatment.treatment.name, (p) => num(p.amount)), ([label, value]) => ({ label, value })));
      }
      case "revenue_by_doctor": {
        const paid = (await this.payments("cur")).filter((p) => p.status === "PAID");
        const names = await this.userNames(paid.flatMap((p) => (p.appointment ? [p.appointment.doctorId] : [])));
        const sums = tally(paid, (p) => p.appointment?.doctorId ?? "", (p) => num(p.amount));
        return breakdown(Array.from(sums, ([k, v]) => ({ label: k ? names.get(k) ?? "Profesional" : "Sin cita asociada", value: v })));
      }
      case "payment_status": {
        const counts = tally((await this.appointments("cur")).filter(notCancelled), (a) => a.paymentStatus);
        return breakdown(
          Object.entries(PAYMENT_STATUS).map(([k, s]) => ({ label: s.label, value: counts.get(k) ?? 0, color: s.color })),
          { keepOrder: true }
        );
      }
      case "cash_income":
        return this.countTrend(this.cash, (c) => c.recordedAt, (c) => c.type === "INCOME", (c) => num(c.amount));
      case "cash_expense":
        return this.countTrend(this.cash, (c) => c.recordedAt, (c) => c.type === "EXPENSE", (c) => num(c.amount));
      case "cash_net":
        return this.countTrend(this.cash, (c) => c.recordedAt, () => true, (c) => (c.type === "INCOME" ? 1 : -1) * num(c.amount));
      case "payouts":
        return this.countTrend(
          this.invoices,
          (i) => {
            // El mes de la boleta cae en el tramo de su primer dia (o en el primero si el mes partio antes).
            const first = `${i.month}-01`;
            return chileLocalToDate(first < this.range.start ? this.range.start : first, "12:00");
          },
          (i) => i.status !== "CANCELLED",
          (i) => num(i.netAmount)
        );
      case "invoices_by_status": {
        const counts = tally(await this.invoices("cur"), (i) => i.status);
        return breakdown(
          Object.entries(INVOICE_STATUS).map(([k, s]) => ({ label: s.label, value: counts.get(k) ?? 0, color: s.color })),
          { keepOrder: true }
        );
      }

      // Tratamientos
      case "treatments_performed":
        return this.countTrend(this.performed, (t) => t.performedAt);
      case "top_treatments":
        return breakdown(Array.from(tally(await this.performed("cur"), (t) => t.treatment.name), ([label, value]) => ({ label, value })));
      case "fonasa_codes": {
        const rows = (await this.performed("cur")).filter((t) => t.treatment.fonasaCode);
        return breakdown(
          Array.from(tally(rows, (t) => `${t.treatment.fonasaCode} · ${t.treatment.name}`), ([label, value]) => ({ label, value }))
        );
      }
      case "new_plans":
        return this.countTrend(this.plans, (p) => p.createdAt);
      case "plans_by_status": {
        const counts = tally(await this.plans("cur"), (p) => p.status);
        return breakdown(
          Object.entries(PLAN_STATUS).map(([k, s]) => ({ label: s.label, value: counts.get(k) ?? 0, color: s.color })),
          { keepOrder: true }
        );
      }
      case "active_plans":
        return { shape: "snapshot", value: await prisma.treatmentPlan.count({ where: { clinicId: this.clinicId, status: "ACTIVE" } }) };

      // Atencion clinica
      case "clinical_visits":
        return this.countTrend((w) => this.dates("clinicalVisit", w), (d) => d);
      case "clinical_records":
        return this.countTrend((w) => this.dates("clinicalRecord", w), (d) => d);
      case "observations":
        return this.countTrend((w) => this.dates("observation", w), (d) => d);
      case "imaging":
        return this.countTrend(this.imaging, (i) => i.studiedAt);
      case "imaging_by_status": {
        const counts = tally(await this.imaging("cur"), (i) => {
          const s = (i.status || "sin estado").trim();
          return s.charAt(0).toUpperCase() + s.slice(1);
        });
        return breakdown(Array.from(counts, ([label, value]) => ({ label, value })));
      }

      // CRM
      case "new_leads":
        return this.countTrend(this.leads, (l) => l.createdAt);
      case "lead_conversion":
        return this.rateTrend(this.leads, (l) => l.createdAt, (l) => l.converted, () => true);
      case "leads_by_channel":
        return breakdown(
          Array.from(tally(await this.leads("cur"), (l) => (l.channel || "Sin canal").trim()), ([label, value]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value,
          }))
        );
      case "pipeline_by_stage": {
        const columns = await prisma.leadColumn.findMany({
          where: { clinicId: this.clinicId },
          orderBy: { position: "asc" },
          select: { name: true, _count: { select: { leads: { where: { archived: false, converted: false } } } } },
        });
        // Las etapas van en el orden del CRM, no por tamaño.
        return breakdown(columns.map((c) => ({ label: c.name, value: c._count.leads })), { keepOrder: true, keepZeros: true });
      }
      case "leads_by_temperature": {
        const rows = await prisma.crmLead.groupBy({
          by: ["aiTemperature"],
          where: { clinicId: this.clinicId, archived: false, converted: false },
          _count: { id: true },
        });
        const counts = new Map(rows.map((r) => [r.aiTemperature ?? "", r._count.id]));
        return breakdown(
          [
            { label: TEMPERATURE.HOT, value: counts.get("HOT") ?? 0, color: "#e34948" },
            { label: TEMPERATURE.WARM, value: counts.get("WARM") ?? 0, color: "#eda100" },
            { label: TEMPERATURE.COLD, value: counts.get("COLD") ?? 0, color: "#2a78d6" },
            { label: "Sin analizar", value: counts.get("") ?? 0, color: "#c3ced6" },
          ],
          { keepOrder: true }
        );
      }
      case "pipeline_value": {
        const sum = await prisma.crmLead.aggregate({
          where: { clinicId: this.clinicId, archived: false, converted: false },
          _sum: { estimatedBudget: true },
        });
        return { shape: "snapshot", value: num(sum._sum.estimatedBudget) };
      }
      case "overdue_followups":
        return this.overdueFollowups();
      case "crm_messages":
        return this.countTrend(this.messages, (msg) => msg.createdAt);
      case "messages_by_direction": {
        const counts = tally(await this.messages("cur"), (msg) => (msg.direction === "INBOUND" ? "in" : "out"));
        return breakdown(
          [
            { label: "Recibidos", value: counts.get("in") ?? 0 },
            { label: "Enviados", value: counts.get("out") ?? 0 },
          ],
          { keepOrder: true }
        );
      }

      // Equipo
      case "professionals":
        return {
          shape: "snapshot",
          value: await prisma.clinicMembership.count({
            where: { clinicId: this.clinicId, status: "ACTIVE", user: { role: "DOCTOR", status: "ACTIVE" } },
          }),
        };
      case "hours_by_doctor": {
        const rows = (await this.appointments("cur")).filter((a) => a.status === "COMPLETED");
        const names = await this.userNames(rows.map((a) => a.doctorId));
        const hours = tally(rows, (a) => a.doctorId, (a) => (a.endAt.getTime() - a.startAt.getTime()) / HOUR);
        return breakdown(Array.from(hours, ([k, v]) => ({ label: names.get(k) ?? "Profesional", value: v })));
      }
      case "alerts_by_type": {
        const rows = await prisma.internalAlert.groupBy({
          by: ["eventType"],
          where: {
            clinicId: this.clinicId,
            createdAt: { gte: this.win.cur.from, lt: this.win.cur.to },
            // Las vacaciones se guardan como alertas, pero no son avisos.
            OR: [{ referenceType: null }, { referenceType: { notIn: ["VACATION", "VACATION_LIMIT"] } }],
          },
          _count: { id: true },
        });
        return breakdown(rows.map((r) => ({ label: ALERT_TYPE[r.eventType] ?? r.eventType, value: r._count.id })));
      }
      case "pending_vacations": {
        const pending = (await VacationsService.listByClinic(this.clinicId)).filter((v) => v.status === "pending");
        const fmt = (d: string) => d.split("-").reverse().join("-");
        return {
          shape: "list",
          total: pending.length,
          rows: pending.slice(0, 20).map((v) => ({
            id: v.id,
            primary: v.userName || v.userEmail,
            secondary: v.note || undefined,
            meta: `${fmt(v.startDate)} al ${fmt(v.endDate)}`,
            status: { label: "Por aprobar", tone: "warn" as const },
          })),
        };
      }
    }
    throw new Error(`Métrica desconocida: ${id}`);
  }

  private async agendaToday(): Promise<MetricResult> {
    const from = chileLocalToDate(this.today, "00:00");
    const to = new Date(from.getTime() + 24 * HOUR);
    const rows = await prisma.appointment.findMany({
      where: { clinicId: this.clinicId, startAt: { gte: from, lt: to } },
      orderBy: { startAt: "asc" },
      take: 40,
      select: {
        id: true,
        startAt: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { profile: { select: { firstName: true, lastName: true } } } },
        box: { select: { name: true } },
        treatmentPlan: { select: { name: true } },
      },
    });
    const list: ListRow[] = rows.map((a) => ({
      id: a.id,
      meta: formatChileTime(a.startAt),
      primary: fullName(a.patient),
      secondary: [a.treatmentPlan?.name, fullName(a.doctor.profile), a.box.name].filter(Boolean).join(" · "),
      status: { label: APPOINTMENT_STATUS[a.status].label, tone: APPOINTMENT_STATUS[a.status].tone },
    }));
    return { shape: "list", total: rows.filter((a) => a.status !== "CANCELLED").length, rows: list };
  }

  private async overdueFollowups(): Promise<MetricResult> {
    const where = { clinicId: this.clinicId, archived: false, converted: false, followUpDate: { lt: this.now } };
    const [total, rows] = await Promise.all([
      prisma.crmLead.count({ where }),
      prisma.crmLead.findMany({
        where,
        orderBy: { followUpDate: "asc" },
        take: 20,
        select: { id: true, name: true, channel: true, followUpDate: true, column: { select: { name: true } } },
      }),
    ]);
    return {
      shape: "list",
      total,
      rows: rows.map((l) => {
        const days = Math.max(1, Math.floor((this.now.getTime() - l.followUpDate!.getTime()) / (24 * HOUR)));
        return {
          id: l.id,
          primary: l.name,
          secondary: [l.column.name, l.channel].filter(Boolean).join(" · "),
          meta: chileDateString(l.followUpDate!).split("-").reverse().join("-"),
          status: { label: days === 1 ? "Hace 1 día" : `Hace ${days} días`, tone: days > 7 ? ("err" as const) : ("warn" as const) },
        };
      }),
    };
  }

  /** Pacientes distintos atendidos y, con `returning`, el % que ya se habia atendido antes. */
  private async attendedPatients(returning: boolean): Promise<MetricResult> {
    const [cur, prev] = await Promise.all([this.appointments("cur"), this.appointments("prev")]);
    const done = (rows: typeof cur) => rows.filter((a) => a.status === "COMPLETED");
    const curDone = done(cur);
    const prevDone = done(prev);

    let firstVisit = new Map<string, Date>();
    if (returning) {
      const ids = Array.from(new Set([...curDone, ...prevDone].map((a) => a.patientId)));
      const rows = ids.length
        ? await prisma.appointment.groupBy({
            by: ["patientId"],
            where: { clinicId: this.clinicId, status: "COMPLETED", patientId: { in: ids } },
            _min: { startAt: true },
          })
        : [];
      firstVisit = new Map(rows.map((r) => [r.patientId, r._min.startAt!]));
    }

    const measure = (rows: typeof cur, since: Date) => {
      const patients = new Set(rows.map((a) => a.patientId));
      if (!returning) return patients.size;
      let back = 0;
      for (const id of Array.from(patients)) {
        const first = firstVisit.get(id);
        if (first && first < since) back += 1;
      }
      return pct(back, patients.size);
    };

    const series = this.range.buckets.map((b) => {
      const rows = curDone.filter((a) => bucketIndex([b], chileDateString(a.startAt)) === 0);
      return { label: b.label, value: measure(rows, chileLocalToDate(b.start, "00:00")) };
    });
    return {
      shape: "trend",
      value: measure(curDone, this.win.cur.from),
      previous: returning && !prevDone.length ? null : measure(prevDone, this.win.prev.from),
      series,
    };
  }
}

/** Calcula varias metricas del mismo periodo. Una metrica que falla no tumba a las demas. */
export async function computeMetrics(clinicId: string, range: PeriodRange, ids: string[], now = new Date()) {
  const service = new DashboardMetrics(clinicId, range, now);
  const out: Record<string, MetricResult | { error: string }> = {};
  await Promise.all(
    ids.map(async (id) => {
      if (!METRIC_BY_ID.has(id) || isTool(id)) {
        out[id] = { error: "Métrica desconocida." };
        return;
      }
      try {
        out[id] = await service.compute(id);
      } catch (error) {
        console.error(`Error calculando la métrica ${id}:`, error);
        out[id] = { error: "No se pudo calcular." };
      }
    })
  );
  return out;
}
