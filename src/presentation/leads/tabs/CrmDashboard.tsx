"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadChannel } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

type PipelineData = {
  columns: PipelineColumn[];
  leads: Lead[];
};

const CHANNEL_COLORS: Record<LeadChannel, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  facebook: "#3b82f6",
  telegram: "#0ea5e9",
  tiktok: "#1e293b",
  email: "#8b5cf6",
  phone: "#10b981",
  website: "#6366f1",
  referral: "#f59e0b",
  other: "#94a3b8",
};

export default function CrmDashboard() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads/pipeline", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData({ columns: d.columns, leads: d.leads });
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.leads.filter((l) => !l.archived);
    const total = active.length;
    const ganadoCol = data.columns.find((c) => c.name.toLowerCase().includes("ganado"));
    const perdidoCol = data.columns.find((c) => c.name.toLowerCase().includes("perdido"));
    const wonCount = ganadoCol ? active.filter((l) => l.columnId === ganadoCol.id).length : 0;
    const lostCount = perdidoCol ? active.filter((l) => l.columnId === perdidoCol.id).length : 0;
    const closedCount = wonCount + lostCount;
    const inProcess = total - closedCount;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
    const totalBudget = active.reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0);
    const wonBudget = ganadoCol
      ? active.filter((l) => l.columnId === ganadoCol.id).reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0)
      : 0;

    const byChannel: Record<string, number> = {};
    for (const lead of active) byChannel[lead.channel] = (byChannel[lead.channel] ?? 0) + 1;

    const funnel = [...data.columns]
      .sort((a, b) => a.position - b.position)
      .map((col) => ({
        name: col.name,
        color: col.color,
        count: active.filter((l) => l.columnId === col.id).length,
      }));

    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const lead of active) byPriority[lead.priority]++;

    const recentTasks = active.slice(0, 6).map((lead) => ({
      id: lead.id,
      name: lead.name || "Lead sin nombre",
      channel: CHANNEL_LABELS[lead.channel] ?? lead.channel,
      status: data.columns.find((column) => column.id === lead.columnId)?.name ?? "Sin estado",
      budget: lead.estimatedBudget ? `$${Number(lead.estimatedBudget).toLocaleString("es-CL")}` : "Sin presupuesto",
    }));

    return { total, inProcess, wonCount, lostCount, conversionRate, totalBudget, wonBudget, byChannel, funnel, byPriority, recentTasks };
  }, [data]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-slate-400">Cargando dashboard...</p></div>;
  }

  if (!stats) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-slate-400">No hay datos disponibles</p></div>;
  }

  const channelEntries = Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1]);
  const maxChannel = Math.max(...channelEntries.map(([, value]) => value), 1);
  const maxFunnel = Math.max(...stats.funnel.map((stage) => stage.count), 1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
          <KpiCard label="Total" value={stats.total} />
          <KpiCard label="Activos" value={stats.inProcess} />
          <KpiCard label="Ganados" value={stats.wonCount} color="text-emerald-600" />
          <KpiCard label="Perdidos" value={stats.lostCount} color="text-rose-500" />
          <KpiCard label="Conversion" value={`${stats.conversionRate}%`} />
          <KpiCard label="Pipeline" value={`$${stats.totalBudget.toLocaleString("es-CL")}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Actividad comercial</h3>
              <span className="text-[11px] text-slate-400">{stats.recentTasks.length} registros</span>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.recentTasks.map((task) => (
                <article key={task.id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_110px_140px_130px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{task.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{task.status}</p>
                  </div>
                  <CompactInfo label="Canal" value={task.channel} />
                  <CompactInfo label="Presupuesto" value={task.budget} />
                  <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">Ver lead</span>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <CompactPanel title="Embudo">
              <div className="space-y-2.5">
                {stats.funnel.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-2.5">
                    <span className="w-24 truncate text-[11px] text-slate-500">{stage.name}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 4)}%`, backgroundColor: stage.color }} />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-slate-600">{stage.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CompactPanel>

            <CompactPanel title="Canales">
              <div className="space-y-2.5">
                {channelEntries.map(([channel, count]) => (
                  <div key={channel} className="flex items-center gap-2.5">
                    <span className="w-24 truncate text-[11px] text-slate-500">{CHANNEL_LABELS[channel as LeadChannel] ?? channel}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((count / maxChannel) * 100, 5)}%`, backgroundColor: CHANNEL_COLORS[channel as LeadChannel] ?? "#94a3b8" }} />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-slate-600">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CompactPanel>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CompactPanel title="Presupuesto">
            <div className="grid grid-cols-2 gap-2.5">
              <MiniMetric label="Total" value={`$${stats.totalBudget.toLocaleString("es-CL")}`} />
              <MiniMetric label="Ganado" value={`$${stats.wonBudget.toLocaleString("es-CL")}`} tone="accent" />
            </div>
          </CompactPanel>

          <CompactPanel title="Prioridad">
            <div className="grid grid-cols-2 gap-2">
              <PriorityPill label="Urgente" count={stats.byPriority.urgent} color="bg-rose-500" />
              <PriorityPill label="Alta" count={stats.byPriority.high} color="bg-orange-500" />
              <PriorityPill label="Media" count={stats.byPriority.medium} color="bg-amber-400" />
              <PriorityPill label="Baja" count={stats.byPriority.low} color="bg-slate-400" />
            </div>
          </CompactPanel>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${color ?? "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function CompactPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-semibold text-slate-900">{title}</h3></div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div className={`rounded-xl px-3 py-3 ${tone === "accent" ? "bg-[#e8f8f9]" : "bg-slate-50"}`}>
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone === "accent" ? "text-[#0f8f98]" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function PriorityPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs text-slate-600">{label}</span>
      <span className="ml-auto text-sm font-semibold tabular-nums text-slate-800">{count}</span>
    </div>
  );
}
