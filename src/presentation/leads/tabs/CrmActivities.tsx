"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadActivity } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS } from "@/domain/leads/entities/Lead";

type ActivityRow = {
  leadId: string;
  leadName: string;
  channel: string;
  activity: LeadActivity;
};

export default function CrmActivities() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "moved" | "created" | "note">("all");

  useEffect(() => {
    fetch("/api/leads/pipeline", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setLeads(d.leads ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const activities: ActivityRow[] = useMemo(() => {
    const rows: ActivityRow[] = [];
    for (const lead of leads) {
      for (const act of lead.activities) rows.push({ leadId: lead.id, leadName: lead.name || "Sin nombre", channel: lead.channel, activity: act });
      rows.push({
        leadId: lead.id,
        leadName: lead.name || "Sin nombre",
        channel: lead.channel,
        activity: { id: `created_${lead.id}`, type: "created", fromValue: null, toValue: CHANNEL_LABELS[lead.channel] ?? lead.channel, userName: null, createdAt: lead.createdAt },
      });
      for (const note of lead.notes) {
        rows.push({
          leadId: lead.id,
          leadName: lead.name || "Sin nombre",
          channel: lead.channel,
          activity: { id: `note_${note.id}`, type: "note", fromValue: null, toValue: note.text, userName: null, createdAt: note.createdAt },
        });
      }
    }

    return rows
      .filter((row) => filter === "all" || row.activity.type === filter)
      .sort((a, b) => new Date(b.activity.createdAt).getTime() - new Date(a.activity.createdAt).getTime());
  }, [leads, filter]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-slate-400">Cargando actividades...</p></div>;
  }

  const FILTERS = [
    { key: "all" as const, label: "Todas" },
    { key: "moved" as const, label: "Movimientos" },
    { key: "created" as const, label: "Creaciones" },
    { key: "note" as const, label: "Notas" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === item.key ? "bg-[#19b3bc] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">{activities.length} actividades</span>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-[15px] top-0 w-px bg-slate-200" />
          <div className="space-y-1.5">
            {activities.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No hay actividades registradas.</p> : null}
            {activities.slice(0, 100).map((row, idx) => {
              const prev = activities[idx - 1];
              const currentDate = new Date(row.activity.createdAt).toLocaleDateString("es-CL");
              const prevDate = prev ? new Date(prev.activity.createdAt).toLocaleDateString("es-CL") : null;
              const showDateHeader = currentDate !== prevDate;

              return (
                <div key={row.activity.id}>
                  {showDateHeader ? (
                    <div className="relative flex items-center gap-2.5 py-2">
                      <div className="z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                        {new Date(row.activity.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{currentDate}</span>
                    </div>
                  ) : null}

                  <div className="relative flex items-start gap-2.5 py-1.5">
                    <ActivityIcon type={row.activity.type} />
                    <article className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">{row.leadName}</p>
                        <ActivityBadge type={row.activity.type} />
                        <span className="ml-auto text-[10px] text-slate-400">
                          {new Date(row.activity.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <ActivityDescription activity={row.activity} />
                    </article>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const base = "z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full";
  if (type === "moved") return <div className={`${base} bg-blue-50 text-blue-500`}>→</div>;
  if (type === "created") return <div className={`${base} bg-emerald-50 text-emerald-500`}>+</div>;
  if (type === "note") return <div className={`${base} bg-amber-50 text-amber-500`}>✎</div>;
  return <div className={`${base} bg-slate-100 text-slate-400`}>•</div>;
}

function ActivityBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    moved: "bg-blue-50 text-blue-600",
    created: "bg-emerald-50 text-emerald-600",
    note: "bg-amber-50 text-amber-600",
  };
  const labels: Record<string, string> = { moved: "Movido", created: "Nuevo", note: "Nota" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[type] ?? "bg-slate-100 text-slate-500"}`}>{labels[type] ?? type}</span>;
}

function ActivityDescription({ activity }: { activity: LeadActivity }) {
  if (activity.type === "moved") {
    return <p className="mt-1 text-xs text-slate-500"><span className="text-slate-600">{activity.fromValue}</span><span className="mx-1 text-slate-300">→</span><span className="font-medium text-slate-700">{activity.toValue}</span></p>;
  }
  if (activity.type === "created") {
    return <p className="mt-1 text-xs text-slate-500">Lead creado via <span className="font-medium text-slate-700">{activity.toValue}</span></p>;
  }
  if (activity.type === "note") return <p className="mt-1 line-clamp-2 text-xs text-slate-500">{activity.toValue}</p>;
  return <p className="mt-1 text-xs text-slate-500">{activity.toValue}</p>;
}
