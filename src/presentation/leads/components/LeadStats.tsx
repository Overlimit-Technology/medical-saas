"use client";

type Stats = {
  total: number;
  inProcess: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  totalBudget: number;
  wonBudget: number;
  byChannel: Record<string, number>;
};

type Props = {
  stats: Stats;
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color ?? "text-slate-800"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function LeadStats({ stats }: Props) {
  return (
    <div className="mb-4 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total Leads" value={String(stats.total)} />
      <StatCard label="En Proceso" value={String(stats.inProcess)} />
      <StatCard label="Ganados" value={String(stats.wonCount)} sub={`$${stats.wonBudget.toLocaleString("es-CL")}`} color="text-emerald-600" />
      <StatCard label="Conversion" value={`${stats.conversionRate}%`} sub={`${stats.wonCount}/${stats.wonCount + stats.lostCount} cerrados`} />
      <StatCard label="Pipeline Total" value={`$${stats.totalBudget.toLocaleString("es-CL")}`} />
    </div>
  );
}
