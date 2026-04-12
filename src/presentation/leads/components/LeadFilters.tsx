"use client";

import { useRef } from "react";
import type { LeadChannel, DoctorOption } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import type { LeadFilters as FiltersType } from "../LeadsViewModel";

type Props = {
  filters: FiltersType;
  columns: PipelineColumn[];
  tags: string[];
  doctors: DoctorOption[];
  onFiltersChange: (fn: (prev: FiltersType) => FiltersType) => void;
  onExport: () => string;
  onImport: (json: string) => void;
};

const channelOptions = Object.entries(CHANNEL_LABELS) as [LeadChannel, string][];

export default function LeadFilters({ filters, columns, tags, doctors, onFiltersChange, onExport, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FiltersType, value: string) => {
    onFiltersChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") onImport(reader.result); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectClass = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";
  const hasFilters = filters.search || filters.channel || filters.sector || filters.columnId || filters.priority || filters.tag || filters.doctorId;

  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={filters.search} onChange={(e) => set("search", e.target.value)} placeholder="Buscar nombre o telefono..."
          className="w-52 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
      </div>

      <select value={filters.channel} onChange={(e) => set("channel", e.target.value)} className={selectClass}>
        <option value="">Origen</option>
        {channelOptions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>

      {doctors.length > 0 && (
        <select value={filters.doctorId} onChange={(e) => set("doctorId", e.target.value)} className={selectClass}>
          <option value="">Medico</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}

      <select value={filters.columnId} onChange={(e) => set("columnId", e.target.value)} className={selectClass}>
        <option value="">Etapa</option>
        {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {tags.length > 0 && (
        <select value={filters.tag} onChange={(e) => set("tag", e.target.value)} className={selectClass}>
          <option value="">Etiqueta</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {hasFilters && (
        <button type="button" onClick={() => onFiltersChange(() => ({ search: "", channel: "", sector: "", columnId: "", priority: "", tag: "", doctorId: "" }))} className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700">Limpiar</button>
      )}

      <div className="flex-1" />

      <button type="button" onClick={handleExport} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50">Exportar</button>
      <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50">Importar</button>
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
    </div>
  );
}
