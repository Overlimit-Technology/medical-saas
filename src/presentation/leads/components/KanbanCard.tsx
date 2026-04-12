"use client";

import { useState, useRef, useEffect } from "react";
import type { Lead } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS, PRIORITY_COLORS } from "@/domain/leads/entities/Lead";

type Props = {
  lead: Lead;
  columnColor: string;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

const TAG_COLORS = [
  { bg: "#ede9fe", text: "#7c3aed" },
  { bg: "#dbeafe", text: "#2563eb" },
  { bg: "#dcfce7", text: "#16a34a" },
  { bg: "#fef3c7", text: "#d97706" },
  { bg: "#fce7f3", text: "#db2777" },
  { bg: "#e0e7ff", text: "#4f46e5" },
  { bg: "#ccfbf1", text: "#0d9488" },
  { bg: "#fee2e2", text: "#dc2626" },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

const CHANNEL_ICONS: Record<string, string> = {
  instagram: "IG", whatsapp: "WA", facebook: "FB", telegram: "TG", tiktok: "TK",
  email: "@", phone: "TEL", website: "WEB", referral: "REF", other: "...",
};

export default function KanbanCard({ lead, columnColor, onClick, onDragStart, onDragEnd, onArchive, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const budget = lead.estimatedBudget;
  const initials = getInitials(lead.name || "SN");

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", lead.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md active:opacity-80"
    >
      {/* Left color accent */}
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ backgroundColor: columnColor }} />

      <div className="pl-2">
        {/* Top: name + priority + menu */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-slate-800 leading-snug">{lead.name || "Sin nombre"}</p>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }} title={lead.priority} />
            {/* Context menu button */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="rounded p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { setMenuOpen(false); onArchive(); }} className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-50">
                    Archivar
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); if (confirm("Eliminar este lead?")) onDelete(); }} className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-rose-500 hover:bg-rose-50">
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {lead.company && <p className="mt-1 text-xs text-slate-400 leading-tight">{lead.company}</p>}
        {lead.mainNote && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">{lead.mainNote}</p>}

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {lead.tags.slice(0, 3).map((tag) => {
              const color = getTagColor(tag);
              return <span key={tag} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: color.bg, color: color.text }}>{tag}</span>;
            })}
            {lead.tags.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">+{lead.tags.length - 3}</span>}
          </div>
        )}

        {/* Bottom: channel + budget + avatar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {CHANNEL_ICONS[lead.channel] || "?"} <span className="font-normal">{CHANNEL_LABELS[lead.channel]}</span>
            </span>
            {budget !== null && budget > 0 && <span className="text-[11px] font-medium tabular-nums text-slate-500">${budget.toLocaleString("es-CL")}</span>}
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: columnColor }} title={lead.name}>{initials}</div>
        </div>
      </div>
    </div>
  );
}
