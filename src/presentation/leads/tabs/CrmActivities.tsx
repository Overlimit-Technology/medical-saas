"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadActivity } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

type ActivityRow = {
  leadId: string;
  leadName: string;
  channel: string;
  activity: LeadActivity;
};

export default function CrmActivities() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "moved" | "created" | "note">("all");

  useEffect(() => {
    fetch("/api/leads/pipeline", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setLeads(d.leads ?? []);
          setColumns(d.columns ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activities: ActivityRow[] = useMemo(() => {
    const rows: ActivityRow[] = [];
    for (const lead of leads) {
      for (const act of lead.activities) {
        rows.push({ leadId: lead.id, leadName: lead.name || "Sin nombre", channel: lead.channel, activity: act });
      }
      // Add creation as activity
      rows.push({
        leadId: lead.id,
        leadName: lead.name || "Sin nombre",
        channel: lead.channel,
        activity: {
          id: `created_${lead.id}`,
          type: "created",
          fromValue: null,
          toValue: CHANNEL_LABELS[lead.channel] ?? lead.channel,
          userName: null,
          createdAt: lead.createdAt,
        },
      });
      // Add notes as activities
      for (const note of lead.notes) {
        rows.push({
          leadId: lead.id,
          leadName: lead.name || "Sin nombre",
          channel: lead.channel,
          activity: {
            id: `note_${note.id}`,
            type: "note",
            fromValue: null,
            toValue: note.text,
            userName: null,
            createdAt: note.createdAt,
          },
        });
      }
    }
    return rows
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "moved") return r.activity.type === "moved";
        if (filter === "created") return r.activity.type === "created";
        if (filter === "note") return r.activity.type === "note";
        return true;
      })
      .sort((a, b) => new Date(b.activity.createdAt).getTime() - new Date(a.activity.createdAt).getTime());
  }, [leads, filter]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Cargando actividades...</p>
      </div>
    );
  }

  const FILTERS = [
    { key: "all" as const, label: "Todas" },
    { key: "moved" as const, label: "Movimientos" },
    { key: "created" as const, label: "Creaciones" },
    { key: "note" as const, label: "Notas" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs text-slate-400 mr-2">Filtrar:</span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400 tabular-nums">{activities.length} actividades</span>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-1">
            {activities.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-12">No hay actividades registradas</p>
            )}
            {activities.slice(0, 100).map((row, idx) => {
              const prev = activities[idx - 1];
              const currentDate = new Date(row.activity.createdAt).toLocaleDateString("es-CL");
              const prevDate = prev ? new Date(prev.activity.createdAt).toLocaleDateString("es-CL") : null;
              const showDateHeader = currentDate !== prevDate;

              return (
                <div key={row.activity.id}>
                  {showDateHeader && (
                    <div className="relative flex items-center gap-3 py-3">
                      <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{currentDate}</span>
                    </div>
                  )}

                  <div className="relative flex items-start gap-3 py-2 pl-0">
                    <ActivityIcon type={row.activity.type} />
                    <div className="min-w-0 flex-1 rounded-lg bg-white border border-slate-100 px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-700">{row.leadName}</span>
                        <ActivityBadge type={row.activity.type} />
                        <span className="ml-auto text-[10px] text-slate-400 tabular-nums">
                          {new Date(row.activity.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <ActivityDescription activity={row.activity} />
                    </div>
                  </div>
                </div>
              );
            })}
            {activities.length > 100 && (
              <p className="text-center text-xs text-slate-400 py-4">Mostrando las ultimas 100 actividades</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const base = "z-10 flex h-10 w-10 items-center justify-center rounded-full shrink-0";
  switch (type) {
    case "moved":
      return (
        <div className={`${base} bg-blue-50`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      );
    case "created":
      return (
        <div className={`${base} bg-emerald-50`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </div>
      );
    case "note":
      return (
        <div className={`${base} bg-amber-50`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </div>
      );
    default:
      return (
        <div className={`${base} bg-slate-100`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10"/></svg>
        </div>
      );
  }
}

function ActivityBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    moved: "bg-blue-50 text-blue-600",
    created: "bg-emerald-50 text-emerald-600",
    note: "bg-amber-50 text-amber-600",
  };
  const labels: Record<string, string> = {
    moved: "Movido",
    created: "Nuevo lead",
    note: "Nota",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[type] ?? "bg-slate-100 text-slate-500"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function ActivityDescription({ activity }: { activity: LeadActivity }) {
  switch (activity.type) {
    case "moved":
      return (
        <p className="mt-1 text-xs text-slate-500">
          <span className="text-slate-600">{activity.fromValue}</span>
          <span className="mx-1.5 text-slate-300">&rarr;</span>
          <span className="font-medium text-slate-700">{activity.toValue}</span>
        </p>
      );
    case "created":
      return (
        <p className="mt-1 text-xs text-slate-500">
          Lead creado via <span className="font-medium text-slate-600">{activity.toValue}</span>
        </p>
      );
    case "note":
      return (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{activity.toValue}</p>
      );
    default:
      return (
        <p className="mt-1 text-xs text-slate-500">
          {activity.fromValue && <span>{activity.fromValue} &rarr; </span>}
          {activity.toValue}
        </p>
      );
  }
}
