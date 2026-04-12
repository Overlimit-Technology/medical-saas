"use client";

import { useState } from "react";
import type { Lead } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import KanbanCard from "./KanbanCard";

type Props = {
  column: PipelineColumn;
  leads: Lead[];
  isDragOver: boolean;
  onLeadClick: (id: string) => void;
  onStartDrag: (leadId: string, fromColumnId: string) => void;
  onEndDrag: () => void;
  onDrop: () => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function KanbanColumn({ column, leads, isDragOver, onLeadClick, onStartDrag, onEndDrag, onDrop, onArchive, onDelete }: Props) {
  const [hovering, setHovering] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHovering(true); };
  const handleDragLeave = () => setHovering(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setHovering(false); onDrop(); };

  return (
    <div
      className={`flex w-[280px] shrink-0 flex-col rounded-2xl border transition-colors ${
        hovering && isDragOver ? "border-slate-300 bg-slate-100" : "border-transparent bg-slate-50/80"
      }`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-sm font-semibold text-slate-700">{column.name}</span>
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums" style={{ backgroundColor: `${column.color}15`, color: column.color }}>{leads.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {leads.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400">Sin leads</div>
        )}
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id} lead={lead} columnColor={column.color}
            onClick={() => onLeadClick(lead.id)}
            onDragStart={() => onStartDrag(lead.id, column.id)}
            onDragEnd={onEndDrag}
            onArchive={() => onArchive(lead.id)}
            onDelete={() => onDelete(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}
