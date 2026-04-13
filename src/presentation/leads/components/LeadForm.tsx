"use client";

import { useState } from "react";
import type { Lead, LeadChannel, LeadPriority, DoctorOption } from "@/domain/leads/entities/Lead";
import { CHANNEL_LABELS, PRIORITY_LABELS } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import type { LeadFormData } from "../LeadsViewModel";

type Props = {
  lead: Lead | null;
  columns: PipelineColumn[];
  tags: string[];
  doctors: DoctorOption[];
  onSave: (data: LeadFormData) => void;
  onClose: () => void;
};

const channelOptions = Object.entries(CHANNEL_LABELS) as [LeadChannel, string][];
const priorityOptions = Object.entries(PRIORITY_LABELS) as [LeadPriority, string][];

export default function LeadForm({ lead, columns, tags, doctors, onSave, onClose }: Props) {
  const [form, setForm] = useState<LeadFormData>({
    name: lead?.name ?? "",
    company: lead?.company ?? "",
    channel: lead?.channel ?? "whatsapp",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    sector: lead?.sector ?? "",
    columnId: lead?.columnId ?? columns[0]?.id ?? "",
    priority: lead?.priority ?? "medium",
    estimatedBudget: lead?.estimatedBudget ? String(lead.estimatedBudget) : "",
    mainNote: lead?.mainNote ?? "",
    tags: lead?.tags ? [...lead.tags] : [],
    assignedDoctorId: lead?.assignedDoctorId ?? "",
    followUpDate: lead?.followUpDate ? lead.followUpDate.slice(0, 10) : "",
  });

  const [tagInput, setTagInput] = useState("");

  const set = (key: keyof LeadFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition";
  const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {lead ? "Editar Lead" : "Nuevo Lead"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label className={labelClass}>Nombre completo *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Nombre del lead" required />
          </div>

          {/* Telefono + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Telefono *</label>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} placeholder="+56 9 1234 5678" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} placeholder="email@ejemplo.com" />
            </div>
          </div>

          {/* Origen + Empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Origen</label>
              <select value={form.channel} onChange={(e) => set("channel", e.target.value)} className={inputClass}>
                {channelOptions.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Empresa / Cuenta</label>
              <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputClass} placeholder="Empresa" />
            </div>
          </div>

          {/* Doctor + Sector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Medico / Especialidad</label>
              <select value={form.assignedDoctorId} onChange={(e) => set("assignedDoctorId", e.target.value)} className={inputClass}>
                <option value="">Sin asignar</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sector</label>
              <input type="text" value={form.sector} onChange={(e) => set("sector", e.target.value)} className={inputClass} placeholder="Ej: Dermatologia..." />
            </div>
          </div>

          {/* Estado + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Columna inicial</label>
              <select value={form.columnId} onChange={(e) => set("columnId", e.target.value)} className={inputClass}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputClass}>
                {priorityOptions.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Presupuesto + Seguimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Presupuesto Estimado (CLP)</label>
              <input type="number" min={0} step="1" value={form.estimatedBudget} onChange={(e) => set("estimatedBudget", e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Fecha de seguimiento</label>
              <input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Etiquetas</label>
            <div className="flex gap-2">
              <input
                type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className={`flex-1 ${inputClass}`} placeholder="Agregar etiqueta..."
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tags.filter((t) => !form.tags.includes(t)).map((t) => <option key={t} value={t} />)}
              </datalist>
              <button type="button" onClick={addTag} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200">+</button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-indigo-400 hover:text-rose-500">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Nota inicial */}
          <div>
            <label className={labelClass}>Nota inicial</label>
            <textarea value={form.mainNote} onChange={(e) => set("mainNote", e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Notas sobre este lead..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white hover:bg-indigo-700">
              {lead ? "Guardar Cambios" : "Crear Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
