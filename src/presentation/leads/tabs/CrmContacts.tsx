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
    let result = leads.filter((lead) => !lead.archived);
    if (search) {
      const query = search.toLowerCase();
      result = result.filter((lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query)
      );
    }
    if (sortBy === "name") result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (sortBy === "recent") result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === "channel") result.sort((a, b) => a.channel.localeCompare(b.channel));
    return result;
  }, [leads, search, sortBy]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-slate-400">Cargando contactos...</p></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contacto..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {([["recent", "Recientes"], ["name", "Nombre"], ["channel", "Canal"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  sortBy === key ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400">{filtered.length} contactos</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((lead) => {
            const initials = (lead.name || "?").split(/\s+/).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
            const column = colMap[lead.columnId];

            return (
              <article key={lead.id} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }} />
                      <p className="truncate text-sm font-medium text-slate-800">{lead.name || "Sin nombre"}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{lead.company || "Sin empresa"}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {lead.phone ? <p className="truncate text-xs text-slate-500">{lead.phone}</p> : null}
                  {lead.email ? <p className="truncate text-xs text-slate-500">{lead.email}</p> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ChannelPill channel={lead.channel} />
                  {column ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${column.color}15`, color: column.color }}>{column.name}</span> : null}
                  {lead.converted ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Paciente</span> : null}
                </div>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 ? <div className="py-14 text-center text-sm text-slate-400">{search ? "No se encontraron contactos" : "No hay contactos en el CRM"}</div> : null}
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
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[channel]}`}>{CHANNEL_LABELS[channel]}</span>;
}
