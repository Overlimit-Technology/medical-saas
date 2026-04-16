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
      .then((d) => { if (d.ok) setData({ columns: d.columns, leads: d.leads }); })
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
    const wonBudget = ganadoCol ? active.filter((l) => l.columnId === ganadoCol.id).reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0) : 0;

    // By channel
    const byChannel: Record<string, number> = {};
    for (const lead of active) byChannel[lead.channel] = (byChannel[lead.channel] ?? 0) + 1;

    // By column (funnel)
    const sortedCols = [...data.columns].sort((a, b) => a.position - b.position);
    const funnel = sortedCols.map((col) => ({
      name: col.name,
      color: col.color,
      count: active.filter((l) => l.columnId === col.id).length,
    }));

    // Recent leads (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = active.filter((l) => new Date(l.createdAt) >= weekAgo).length;

    // By priority
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const lead of active) byPriority[lead.priority]++;

    return { total, inProcess, wonCount, lostCount, conversionRate, totalBudget, wonBudget, byChannel, funnel, recentCount, byPriority };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Cargando dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">No hay datos disponibles</p>
      </div>
    );
  }

  const maxFunnel = Math.max(...stats.funnel.map((f) => f.count), 1);
  const channelEntries = Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1]);
  const maxChannel = Math.max(...channelEntries.map(([, v]) => v), 1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total Leads" value={stats.total} />
          <KpiCard label="En Proceso" value={stats.inProcess} />
          <KpiCard label="Ganados" value={stats.wonCount} color="text-emerald-600" />
          <KpiCard label="Perdidos" value={stats.lostCount} color="text-red-500" />
          <KpiCard label="Conversion" value={`${stats.conversionRate}%`} />
          <KpiCard label="Nuevos (7d)" value={stats.recentCount} color="text-indigo-600" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pipeline Funnel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Embudo del Pipeline</h3>
            <div className="space-y-3">
              {stats.funnel.map((stage) => (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-500 truncate text-right">{stage.name}</span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max((stage.count / maxFunnel) * 100, 2)}%`,
                        backgroundColor: stage.color,
                        opacity: 0.85,
                      }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-600">
                      {stage.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Leads por Canal</h3>
            <div className="space-y-3">
              {channelEntries.map(([channel, count]) => (
                <div key={channel} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-500 truncate text-right">
                    {CHANNEL_LABELS[channel as LeadChannel] ?? channel}
                  </span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max((count / maxChannel) * 100, 4)}%`,
                        backgroundColor: CHANNEL_COLORS[channel as LeadChannel] ?? "#94a3b8",
                        opacity: 0.8,
                      }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-600">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
              {channelEntries.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Sin datos de canales</p>
              )}
            </div>
          </div>

          {/* Budget overview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Presupuesto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pipeline Total</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">${stats.totalBudget.toLocaleString("es-CL")}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">Ganado</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">${stats.wonBudget.toLocaleString("es-CL")}</p>
              </div>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Por Prioridad</h3>
            <div className="grid grid-cols-2 gap-3">
              <PriorityCard label="Urgente" count={stats.byPriority.urgent} color="bg-red-500" />
              <PriorityCard label="Alta" count={stats.byPriority.high} color="bg-orange-500" />
              <PriorityCard label="Media" count={stats.byPriority.medium} color="bg-amber-400" />
              <PriorityCard label="Baja" count={stats.byPriority.low} color="bg-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color ?? "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function PriorityCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-slate-800">{count}</p>
      </div>
    </div>
  );
}
