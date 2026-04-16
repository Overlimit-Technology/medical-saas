"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadChannel } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS, PRIORITY_COLORS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

export default function CrmContacts() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "channel">("recent");

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

  const colMap = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c])), [columns]);

  const filtered = useMemo(() => {
    let result = leads.filter((l) => !l.archived);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "recent":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "channel":
        result.sort((a, b) => a.channel.localeCompare(b.channel));
        break;
    }
    return result;
  }, [leads, search, sortBy]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Cargando contactos...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contacto..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
            {([["recent", "Recientes"], ["name", "Nombre"], ["channel", "Canal"]] as const).map(([key, label]) => (
              <button
                key={key} type="button" onClick={() => setSortBy(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  sortBy === key ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 tabular-nums">{filtered.length} contactos</span>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((lead) => {
            const col = colMap[lead.columnId];
            const initials = (lead.name || "?")
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w.charAt(0).toUpperCase())
              .join("");

            return (
              <div
                key={lead.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }} />
                      <p className="text-sm font-medium text-slate-800 truncate">{lead.name || "Sin nombre"}</p>
                    </div>
                    {lead.company && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{lead.company}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span className="truncate tabular-nums">{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <ChannelPill channel={lead.channel} />
                  {col && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${col.color}15`, color: col.color }}
                    >
                      {col.name}
                    </span>
                  )}
                  {lead.converted && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Paciente</span>
                  )}
                </div>

                <p className="mt-2 text-[10px] text-slate-400 tabular-nums">
                  {new Date(lead.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-slate-400">
              {search ? "No se encontraron contactos" : "No hay contactos en el CRM"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelPill({ channel }: { channel: LeadChannel }) {
  const colors: Record<LeadChannel, string> = {
    whatsapp: "bg-green-50 text-green-700",
    instagram: "bg-pink-50 text-pink-700",
    facebook: "bg-blue-50 text-blue-700",
    telegram: "bg-sky-50 text-sky-700",
    tiktok: "bg-slate-100 text-slate-700",
    email: "bg-violet-50 text-violet-700",
    phone: "bg-emerald-50 text-emerald-700",
    website: "bg-indigo-50 text-indigo-700",
    referral: "bg-amber-50 text-amber-700",
    other: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[channel]}`}>
      {CHANNEL_LABELS[channel]}
    </span>
  );
}
