"use client";

import { useState } from "react";
import type { Lead, DoctorOption } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import LeadChat from "./LeadChat";

type Props = {
  lead: Lead;
  columns: PipelineColumn[];
  doctors: DoctorOption[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onConvert: () => void;
  onMoveLead: (leadId: string, toColumnId: string) => void;
  onAddNote: (leadId: string, text: string) => void;
  onAddMessage: (leadId: string, text: string, direction: "inbound" | "outbound") => void;
};

type Tab = "info" | "activity" | "notes" | "chat";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: undefined }) +
    ", " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function LeadDetailPanel({ lead, columns, doctors, onClose, onEdit, onDelete, onArchive, onConvert, onMoveLead, onAddNote, onAddMessage }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [noteText, setNoteText] = useState("");

  const currentCol = columns.find((c) => c.id === lead.columnId);
  const assignedDoctor = doctors.find((d) => d.id === lead.assignedDoctorId);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote(lead.id, noteText.trim());
    setNoteText("");
  };

  const phoneClean = lead.phone.replace(/[^+0-9]/g, "");

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-[11px] font-medium transition rounded-md ${
      tab === t ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-800">{lead.name || "Sin nombre"}</h2>
            {lead.converted && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Convertido</span>}
            {lead.archived && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Archivado</span>}
          </div>
          {lead.company && <p className="truncate text-xs text-slate-400">{lead.company}</p>}
        </div>
        <div className="ml-3 flex items-center gap-1.5">
          <button type="button" onClick={onEdit} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Editar</button>
          <button type="button" onClick={onClose} className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex shrink-0 gap-2 border-b border-slate-100 px-5 py-2.5">
        {phoneClean && (
          <>
            <a href={`tel:${phoneClean}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Llamar</a>
            <a href={`https://wa.me/${phoneClean.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50">WhatsApp</a>
          </>
        )}
        <a href="/agenda" className="rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50">Agendar</a>
        {!lead.converted && (
          <button type="button" onClick={onConvert} className="rounded-lg border border-violet-200 px-2.5 py-1 text-[11px] font-medium text-violet-600 hover:bg-violet-50">Convertir a paciente</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-slate-100 px-5 py-2">
        <button type="button" onClick={() => setTab("info")} className={tabClass("info")}>Info</button>
        <button type="button" onClick={() => setTab("activity")} className={tabClass("activity")}>
          Actividad {lead.activities.length > 0 && <span className="ml-1 tabular-nums">({lead.activities.length})</span>}
        </button>
        <button type="button" onClick={() => setTab("notes")} className={tabClass("notes")}>
          Notas {lead.notes.length > 0 && <span className="ml-1 tabular-nums">({lead.notes.length})</span>}
        </button>
        <button type="button" onClick={() => setTab("chat")} className={tabClass("chat")}>Chat</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "info" && (
          <div className="space-y-4 p-5">
            {/* Key info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Informacion</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Telefono" value={lead.phone} mono />
                <InfoRow label="Email" value={lead.email} />
                <InfoRow label="Origen" value={CHANNEL_LABELS[lead.channel]} />
                <InfoRow label="Empresa" value={lead.company} />
                <InfoRow label="Sector" value={lead.sector} />
                <InfoRow label="Presupuesto" value={lead.estimatedBudget ? `$${lead.estimatedBudget.toLocaleString("es-CL")}` : "—"} mono />
                <InfoRow label="Medico" value={assignedDoctor ? `${assignedDoctor.name}${assignedDoctor.specialty ? ` (${assignedDoctor.specialty})` : ""}` : "—"} />
                <InfoRow label="Seguimiento" value={lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString("es-CL") : "—"} />
              </div>
            </div>

            {/* Estado + Prioridad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</p>
                <select value={lead.columnId} onChange={(e) => onMoveLead(lead.id, e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none">
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {currentCol && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentCol.color }} />
                    <span className="text-[10px] text-slate-400">{currentCol.name}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Prioridad</p>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[lead.priority] }} />
                  <span className="text-xs font-medium" style={{ color: PRIORITY_COLORS[lead.priority] }}>{PRIORITY_LABELS[lead.priority]}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {lead.tags.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Main note */}
            {lead.mainNote && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Nota Principal</p>
                <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{lead.mainNote}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="text-[10px] tabular-nums text-slate-400">
              <p>Creado: {new Date(lead.createdAt).toLocaleString("es-CL")}</p>
              <p>Actualizado: {new Date(lead.updatedAt).toLocaleString("es-CL")}</p>
            </div>

            {/* Archive / Delete */}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={onArchive} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50">
                {lead.archived ? "Desarchivar" : "Archivar"}
              </button>
              <button type="button" onClick={() => { if (confirm("Eliminar este lead permanentemente?")) onDelete(); }} className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-50">Eliminar</button>
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="p-5">
            {lead.activities.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">Sin actividad registrada</p>
            )}
            <div className="relative space-y-0">
              {lead.activities.map((act, i) => (
                <div key={act.id} className="relative flex gap-3 pb-4">
                  {/* Timeline line */}
                  {i < lead.activities.length - 1 && (
                    <div className="absolute left-[7px] top-5 h-full w-px bg-slate-200" />
                  )}
                  {/* Dot */}
                  <div className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                    act.type === "moved" ? "border-indigo-400 bg-indigo-100" :
                    act.type === "converted" ? "border-emerald-400 bg-emerald-100" :
                    act.type === "archived" ? "border-slate-400 bg-slate-100" :
                    act.type === "created" ? "border-blue-400 bg-blue-100" :
                    "border-slate-300 bg-slate-50"
                  }`} />
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700">
                      {act.type === "moved" && <>Movido de <strong>{act.fromValue}</strong> a <strong>{act.toValue}</strong></>}
                      {act.type === "created" && <>Lead creado</>}
                      {act.type === "converted" && <>Convertido a paciente</>}
                      {act.type === "archived" && <>Archivado</>}
                      {act.type === "unarchived" && <>Desarchivado</>}
                    </p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                      {formatDate(act.createdAt)}
                      {act.userName && <> &middot; {act.userName}</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="p-5">
            <div className="mb-4">
              <textarea
                value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribir nueva nota..."
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-400"
              />
              <div className="mt-1.5 flex justify-end">
                <button type="button" onClick={handleAddNote} disabled={!noteText.trim()}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700">
                  Agregar nota
                </button>
              </div>
            </div>

            {lead.notes.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sin notas</p>}
            <div className="space-y-2">
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs leading-relaxed text-slate-600">{note.text}</p>
                  <p className="mt-1 text-[10px] tabular-nums text-slate-400">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <LeadChat lead={lead} onSendMessage={(text, direction) => onAddMessage(lead.id, text, direction)} />
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xs font-medium text-slate-800 ${mono ? "tabular-nums" : ""}`}>{value || "—"}</p>
    </div>
  );
}
