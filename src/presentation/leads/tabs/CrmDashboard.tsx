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
  const activeTasks = stats.inProcess;
  const totalAssignees = Math.max(1, Math.min(stats.total, 9));
  const projects = stats.funnel
    .filter((stage) => stage.count > 0)
    .slice(0, 6)
    .map((stage, index) => ({
      id: `PRJ-${String(index + 1).padStart(4, "0")}`,
      name: stage.name,
      count: stage.count,
      color: stage.color,
    }));
  const tasks = (data?.leads ?? [])
    .filter((lead) => !lead.archived)
    .slice(0, 8)
    .map((lead) => ({
      id: lead.id,
      name: lead.name || "Lead sin nombre",
      estimate: lead.estimatedBudget ? `$${Number(lead.estimatedBudget).toLocaleString("es-CL")}` : "Sin presupuesto",
      priority: lead.priority,
      status: data?.columns.find((column) => column.id === lead.columnId)?.name ?? "Sin estado",
      channel: CHANNEL_LABELS[lead.channel] ?? lead.channel,
      done: lead.converted,
    }));

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

        {/* Figma-inspired Projects + Tasks section (without external sidebar) */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Current Projects</h3>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    index === 0
                      ? "border-blue-100 bg-slate-50"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] text-slate-400">{project.id}</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{project.name}</p>
                  <p className="mt-2 text-xs text-blue-600">Ver detalles ({project.count})</p>
                </button>
              ))}
              {projects.length === 0 && <p className="px-2 py-4 text-xs text-slate-400">Sin proyectos activos.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Active Tasks</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{tasks.length}</span>
            </div>
            <div className="space-y-2 p-3">
              {tasks.map((task) => (
                <article key={task.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_130px_110px_130px_90px] md:items-center">
                  <div>
                    <p className="text-[11px] text-slate-400">Task Name</p>
                    <p className="text-sm font-semibold text-slate-800">{task.name}</p>
                  </div>
                  <InfoColumn label="Estimate" value={task.estimate} />
                  <InfoColumn label="Canal" value={task.channel} />
                  <InfoColumn label="Prioridad" value={priorityLabel(task.priority)} />
                  <StatusBadge status={task.status} done={task.done} />
                </article>
              ))}
              {tasks.length === 0 && <p className="px-2 py-8 text-center text-xs text-slate-400">Sin tareas activas.</p>}
            </div>
          </div>
        </section>

        <ProjectDataCard
          code="CRM-0001265"
          title="Medical SaaS CRM Pipeline"
          createdAtLabel="Creado Sep 12, 2020"
          priorityLabel={stats.byPriority.medium > 0 ? "Media" : "Normal"}
          totalTasks={stats.total}
          activeTasks={activeTasks}
          assignees={Math.min(totalAssignees, 3)}
          extraAssignees={Math.max(totalAssignees - 3, 0)}
        />

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

function ProjectDataCard({
  code,
  title,
  createdAtLabel,
  priorityLabel,
  totalTasks,
  activeTasks,
  assignees,
  extraAssignees,
}: {
  code: string;
  title: string;
  createdAtLabel: string;
  priorityLabel: string;
  totalTasks: number;
  activeTasks: number;
  assignees: number;
  extraAssignees: number;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="p-5 sm:p-6">
          <p className="text-sm text-slate-400">{code}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{title}</h3>
          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm">
            <p className="text-slate-500">{createdAtLabel}</p>
            <p className="font-semibold text-amber-500">{priorityLabel}</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h4 className="text-2xl font-semibold text-slate-900">Project Data</h4>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Metric label="All tasks" value={totalTasks} />
            <Metric label="Active tasks" value={activeTasks} />
            <div>
              <p className="text-sm text-slate-400">Assignees</p>
              <div className="mt-2 flex items-center">
                {Array.from({ length: assignees }).map((_, i) => (
                  <span
                    key={i}
                    className="-ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-500 text-[10px] font-semibold text-white first:ml-0"
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
                {extraAssignees > 0 && (
                  <span className="-ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-[10px] font-semibold text-white">
                    +{extraAssignees}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold leading-none text-slate-900">{value}</p>
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

function InfoColumn({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function StatusBadge({ status, done }: { status: string; done: boolean }) {
  const tone = done
    ? "bg-emerald-100 text-emerald-700"
    : "bg-indigo-100 text-indigo-700";
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{status}</span>;
}

function priorityLabel(value: Lead["priority"]) {
  if (value === "urgent") return "Urgente";
  if (value === "high") return "Alta";
  if (value === "medium") return "Media";
  return "Baja";
}
