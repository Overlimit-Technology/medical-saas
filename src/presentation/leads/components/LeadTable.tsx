"use client";

import type { Lead, DoctorOption } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS, PRIORITY_COLORS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import type { SortConfig } from "../LeadsViewModel";

type Props = {
  leads: Lead[];
  columns: PipelineColumn[];
  doctors: DoctorOption[];
  sort: SortConfig;
  onLeadClick: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSort: (key: string) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="ml-1 text-slate-300">&uarr;&darr;</span>;
  return <span className="ml-1 text-indigo-500">{dir === "asc" ? "\u2191" : "\u2193"}</span>;
}

export default function LeadTable({ leads, columns, doctors, sort, onLeadClick, onArchive, onDelete, onSort }: Props) {
  const colMap = Object.fromEntries(columns.map((c) => [c.id, c]));
  const docMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  const thClass = "px-3 py-2.5 font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-600 transition text-[10px]";

  return (
    <div className="h-full overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1000px] text-left text-xs">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={thClass} onClick={() => onSort("name")}>Nombre <SortIcon active={sort.key === "name"} dir={sort.dir} /></th>
            <th className={thClass} onClick={() => onSort("phone")}>Telefono <SortIcon active={sort.key === "phone"} dir={sort.dir} /></th>
            <th className={thClass} onClick={() => onSort("channel")}>Origen <SortIcon active={sort.key === "channel"} dir={sort.dir} /></th>
            <th className={thClass}>Etapa</th>
            <th className={thClass}>Medico</th>
            <th className={thClass}>Ultima nota</th>
            <th className={thClass} onClick={() => onSort("createdAt")}>Ingreso <SortIcon active={sort.key === "createdAt"} dir={sort.dir} /></th>
            <th className={`${thClass} w-20`} />
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">No se encontraron leads</td></tr>
          )}
          {leads.map((lead) => {
            const col = colMap[lead.columnId];
            const doc = lead.assignedDoctorId ? docMap[lead.assignedDoctorId] : null;
            const lastNote = lead.notes[0];
            return (
              <tr key={lead.id} onClick={() => onLeadClick(lead.id)} className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }} />
                    <span className="font-medium text-slate-800">{lead.name || "Sin nombre"}</span>
                    {lead.converted && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Conv.</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-500">{lead.phone || "—"}</td>
                <td className="px-3 py-2.5 text-slate-500">{CHANNEL_LABELS[lead.channel]}</td>
                <td className="px-3 py-2.5">
                  {col && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${col.color}15`, color: col.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                      {col.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-500">{doc ? doc.name : "—"}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-500">{lastNote ? lastNote.text : "—"}</td>
                <td className="px-3 py-2.5 tabular-nums text-slate-400">{new Date(lead.createdAt).toLocaleDateString("es-CL")}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => onArchive(lead.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Archivar">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                    </button>
                    <button type="button" onClick={() => { if (confirm("Eliminar este lead?")) onDelete(lead.id); }} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Eliminar">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
