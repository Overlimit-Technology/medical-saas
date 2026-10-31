"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, Inbox, RefreshCw, Users, Wallet, Building2 } from "lucide-react";
import {
  Card,
  CardLink,
  EmptyState,
  Loading,
  Notice,
  PageHead,
  Stat,
  StatusPill,
  View,
  btnClass,
  type Tone,
} from "@/presentation/ui/zs";

type Status = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type Overview = {
  clinic: { name: string; city: string };
  stats: { today: number; todayConfirmed: number; patients: number; newLeads: number; monthRevenue: number };
  weekDays: Array<{ label: string; isToday: boolean; count: number }>;
  byStatus: Record<Status, number>;
  agenda: Array<{
    id: string;
    startAt: string;
    status: Status;
    patient: string;
    doctor: string;
    box: string;
    reason: string | null;
  }>;
  occupancy: Array<{ doctorId: string; name: string; count: number }>;
};

// Estados en palabras del equipo, con los tonos del portal (un solo acento + ambar para lo pendiente).
const STATUS: Record<Status, { label: string; tone: Tone; color: string }> = {
  SCHEDULED: { label: "Agendada", tone: "warn", color: "#e8a020" },
  CONFIRMED: { label: "Confirmada", tone: "ok", color: "#50c9d5" },
  COMPLETED: { label: "Completada", tone: "ok", color: "#1e737b" },
  CANCELLED: { label: "Cancelada", tone: "off", color: "#c3ced6" },
  NO_SHOW: { label: "No asistió", tone: "err", color: "#e5484d" },
};

const clp = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function WeekBars({ days }: { days: Overview["weekDays"] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div
      role="img"
      aria-label={`Citas por día: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}
      className="flex h-48 items-end gap-3"
    >
      {days.map((d) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-slate-900">{d.count}</span>
          <div
            className={`w-full rounded-t-[14px] bg-gradient-to-t from-[#50c9d5] to-[#84d9e1] transition-[height] duration-500 ${d.isToday ? "" : "opacity-55"}`}
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
          <span className={`text-xs ${d.isToday ? "font-bold text-[#1e737b]" : "text-slate-500"}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusDonut({ byStatus }: { byStatus: Overview["byStatus"] }) {
  const parts = (Object.keys(STATUS) as Status[]).map((s) => ({ s, v: byStatus[s] ?? 0 }));
  const total = parts.reduce((a, p) => a + p.v, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Estado de las citas de la semana: ${parts.map((p) => `${STATUS[p.s].label} ${p.v}`).join(", ")}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e8edf1" strokeWidth="16" />
        {parts
          .filter((p) => p.v)
          .map((p) => {
            const len = (p.v / (total || 1)) * C;
            const off = -acc;
            acc += len;
            return (
              <circle
                key={p.s}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={STATUS[p.s].color}
                strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={off}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        <text x="70" y="70" textAnchor="middle" className="fill-slate-900 font-display" style={{ fontSize: 26, fontWeight: 700 }}>
          {total}
        </text>
        <text x="70" y="88" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
          citas
        </text>
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-2 text-[13px]">
        {parts.map((p) => (
          <li key={p.s} className="flex items-center gap-2 text-slate-900">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[p.s].color }} />
            {STATUS[p.s].label}
            <span className="ml-auto pl-3 font-semibold tabular-nums">{p.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/clinic-overview", { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar la vista general.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = capFirst(new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }));
  const maxOcc = Math.max(1, ...(data?.occupancy.map((o) => o.count) ?? [1]));

  return (
    <View label="Vista general">
      <PageHead
        tag={today}
        title="Vista general"
        accent={data?.clinic.name ? `· ${data.clinic.name}` : undefined}
        lead="Lo importante de tu clínica hoy: citas, pacientes, leads e ingresos."
        actions={
          <>
            <a href="/clinic-dashboard/clinica" className={btnClass("quiet", "sm")}>
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
              Mi clínica
            </a>
            <button type="button" onClick={() => void load()} disabled={loading} className={btnClass("quiet", "sm")}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Actualizar
            </button>
          </>
        }
      />

      {error ? <Notice tone="err">{error}</Notice> : null}
      {!data && loading ? <Loading label="Cargando la vista general…" /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              highlight
              label="Citas de hoy"
              value={data.stats.today}
              hint={`${data.stats.todayConfirmed} confirmadas o completadas`}
              icon={CalendarCheck}
              href="/agenda"
            />
            <Stat label="Pacientes" value={data.stats.patients} hint="Con ficha activa" icon={Users} href="/patients" />
            <Stat label="Leads nuevos" value={data.stats.newLeads} hint="Pendientes de contactar" icon={Inbox} href="/crm" />
            <Stat label="Ingresos del mes" value={clp(data.stats.monthRevenue)} hint="Pagos registrados como pagados" icon={Wallet} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Citas de la semana" className="lg:col-span-2">
              <WeekBars days={data.weekDays} />
            </Card>
            <Card title="Estado de las citas">
              <StatusDonut byStatus={data.byStatus} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Agenda de hoy" action={<CardLink href="/agenda">Ver agenda →</CardLink>} className="lg:col-span-2">
              {data.agenda.length ? (
                <ul className="flex flex-col">
                  {data.agenda.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center gap-4 border-t border-slate-200 py-3 first:border-t-0 first:pt-0">
                      <span className="w-14 font-display text-[15px] font-bold tabular-nums text-[#1e737b]">{time(a.startAt)}</span>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate font-display text-[14.5px] font-semibold text-slate-900">{a.patient}</b>
                        <span className="block truncate text-[13px] text-slate-500">
                          {[a.reason, a.doctor, a.box].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <StatusPill tone={STATUS[a.status].tone}>{STATUS[a.status].label}</StatusPill>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No hay citas para hoy">Cuando se agenden, aparecerán aquí en orden de hora.</EmptyState>
              )}
            </Card>
            <Card title="Ocupación por profesional (hoy)">
              {data.occupancy.length ? (
                <ul className="space-y-3.5">
                  {data.occupancy.map((o) => (
                    <li key={o.doctorId}>
                      <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                        <span className="truncate font-medium text-slate-900">{o.name}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {o.count} {o.count === 1 ? "cita" : "citas"}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#50c9d5] transition-[width] duration-500" style={{ width: `${(o.count / maxOcc) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Aún no hay profesionales">
                  <a className="text-[#1e737b] underline-offset-2 hover:underline" href="/usuarios">
                    Agrega a tu equipo
                  </a>{" "}
                  para ver su ocupación.
                </EmptyState>
              )}
            </Card>
          </div>
        </>
      ) : null}

      {!data && !loading && !error ? (
        <Card>
          <EmptyState title="Sin datos todavía">
            <CalendarDays className="mx-auto mb-2 h-5 w-5" /> Agenda tu primera cita para ver el resumen.
          </EmptyState>
        </Card>
      ) : null}
    </View>
  );
}
