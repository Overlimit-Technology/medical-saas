"use client";

import { Banknote, Building2, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { BillingMetrics } from "@/server/super-admin/billingMetricsCalc";
import { Badge, PageHeader, StatTile } from "./SuperAdminPrimitives";

const clp = (value: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
const pct = (value: number | null) => (value === null ? "-" : `${(value * 100).toFixed(1)}%`);

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", { month: "short" }).format(new Date(y, m - 1, 1));
}

function statusTone(status: string): "emerald" | "amber" | "rose" | "slate" {
  if (status === "ACTIVE") return "emerald";
  if (status === "PAST_DUE") return "amber";
  if (status === "CANCELED") return "rose";
  return "slate";
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Activa",
  PAST_DUE: "Pago atrasado",
  CANCELED: "Cancelada",
};

// Barras de ingreso (MRR) y costo por mes, en SVG simple.
function MrrChart({ months }: { months: BillingMetrics["months"] }) {
  const W = 640;
  const H = 220;
  const pad = { l: 8, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...months.flatMap((m) => [m.mrr, m.costs]));
  const slot = (W - pad.l - pad.r) / months.length;
  const barW = Math.min(28, slot / 2 - 4);
  const h = (v: number) => ((H - pad.t - pad.b) * v) / max;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="MRR y costos de los ultimos meses" className="w-full">
      {months.map((m, i) => {
        const x = pad.l + i * slot + slot / 2;
        const base = H - pad.b;
        return (
          <g key={m.month}>
            <rect x={x - barW - 2} y={base - h(m.mrr)} width={barW} height={h(m.mrr)} rx={3} className="fill-teal-500">
              <title>{`${m.month} MRR ${clp(m.mrr)}`}</title>
            </rect>
            <rect x={x + 2} y={base - h(m.costs)} width={barW} height={h(m.costs)} rx={3} className="fill-slate-300">
              <title>{`${m.month} costos ${clp(m.costs)}`}</title>
            </rect>
            <text x={x} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {monthLabel(m.month)}
            </text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="stroke-slate-200" />
    </svg>
  );
}

export default function SuperAdminBilling({ data }: { data: BillingMetrics }) {
  const cur = data.currentMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Facturacion"
        description="Ingresos recurrentes, churn y margen de la plataforma. Solo visible para super admin."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="MRR" value={clp(data.mrr)} sub={`ARR ${clp(data.arr)}`} icon={Banknote} tone="teal" />
        <StatTile
          label="Sedes que pagan"
          value={data.payingClinics}
          sub={data.arpa === null ? "Sin ARPA" : `ARPA ${clp(data.arpa)}`}
          icon={Building2}
          tone="cyan"
        />
        <StatTile
          label="Churn del mes"
          value={pct(cur.churnRate)}
          sub={`${cur.churnedClinics} cancelada(s), ${clp(cur.churnedMrr)}`}
          icon={TrendingDown}
          tone="rose"
        />
        <StatTile
          label="Margen del mes"
          value={clp(cur.margin)}
          sub={`${pct(cur.marginPercent)} sobre MRR, costos ${clp(cur.costs)}`}
          icon={Percent}
          tone={cur.margin >= 0 ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">MRR y costos por mes</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500" />MRR</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" />Costos</span>
            </div>
          </div>
          <MrrChart months={data.months} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Estado</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Altas del mes</dt><dd className="font-semibold">{cur.newClinics} ({clp(cur.newMrr)})</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Pago atrasado</dt><dd className="font-semibold">{data.pastDueClinics} ({clp(data.mrrAtRisk)})</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">En trial</dt><dd className="font-semibold">{data.trialClinics}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Trials por vencer (7 dias)</dt><dd className="font-semibold">{data.trialsExpiringSoon}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Canceladas</dt><dd className="font-semibold">{data.canceledClinics}</dd></div>
          </dl>
          <h3 className="mt-5 text-sm font-semibold text-slate-900">Por plan</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.byPlan.length === 0 && <li className="text-slate-500">Sin sedes que paguen.</li>}
            {data.byPlan.map((p) => (
              <li key={p.plan} className="flex justify-between">
                <span className="text-slate-600">{p.plan} ({p.clinics})</span>
                <span className="font-semibold">{clp(p.mrr)}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold text-slate-900">Costos del mes</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.costsByCategory.length === 0 && <li className="text-slate-500">Sin costos registrados.</li>}
            {data.costsByCategory.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span className="text-slate-600">{c.category}</span>
                <span className="font-semibold">{clp(c.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Wallet className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Sedes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Sede</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Precio mensual</th>
                <th className="px-5 py-3">Trial hasta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.clinics.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c.plan}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</Badge></td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.paying ? clp(c.monthlyPrice) : "-"}</td>
                  <td className="px-5 py-3 text-slate-600">{c.trialEndsAt ? new Date(c.trialEndsAt).toLocaleDateString("es-CL") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="flex items-center gap-1 text-xs text-slate-400"><TrendingUp className="h-3 w-3" /> Calculado {new Date(data.generatedAt).toLocaleString("es-CL")}</p>
    </div>
  );
}
