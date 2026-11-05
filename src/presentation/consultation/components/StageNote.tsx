"use client";

import { useEffect, useRef } from "react";
import type { ConsultationDraft } from "@/domain/consultations/entities/Consultation";
import { NOTE_FORMATS, type AttentionTypeDef } from "@/lib/clinical/attentionTypes";
import type { ConsultationStageMeta } from "../consultation.constants";
import StagePanel from "./StagePanel";

type Props = {
  stage: ConsultationStageMeta;
  type: AttentionTypeDef;
  draft: ConsultationDraft;
  readOnly: boolean;
  onBlockChange: (id: string, value: string) => void;
};

function NoteArea({ id, label, placeholder, value, readOnly, onChange }: { id: string; label: string; placeholder: string; value: string; readOnly: boolean; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.max(node.scrollHeight, 110)}px`;
  }, [value]);
  return (
    <div>
      <label htmlFor={`note-${id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <textarea
        id={`note-${id}`}
        ref={ref}
        rows={4}
        value={value}
        disabled={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 transition-all duration-200 placeholder:text-slate-300 focus:border-[#50c9d5] focus:outline-none focus:ring-2 focus:ring-[#50c9d5]/15 disabled:bg-slate-50"
      />
    </div>
  );
}

/** Nota de evolucion en el formato del tipo de atencion: SOAP, DAP, BIRP o texto libre. */
export default function StageNote({ stage, type, draft, readOnly, onBlockChange }: Props) {
  const format = NOTE_FORMATS[type.noteFormat];
  return (
    <StagePanel
      stage={stage}
      aside={<span className="rounded-full bg-[#50c9d5]/10 px-3 py-1 text-xs font-bold tracking-wide text-[#1e737b]">{format.label}</span>}
    >
      <div className="space-y-5">
        {format.fields.map((field) => (
          <NoteArea key={field.id} id={field.id} label={field.label} placeholder={field.placeholder} value={draft.blocks?.[field.id] ?? ""} readOnly={readOnly} onChange={(v) => onBlockChange(field.id, v)} />
        ))}
      </div>
    </StagePanel>
  );
}
