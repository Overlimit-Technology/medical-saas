"use client";

import type { Lead } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import KanbanColumn from "./KanbanColumn";

type Props = {
  columns: PipelineColumn[];
  leads: Lead[];
  dragState: { leadId: string; fromColumnId: string } | null;
  onLeadClick: (id: string) => void;
  onStartDrag: (leadId: string, fromColumnId: string) => void;
  onEndDrag: () => void;
  onDropOnColumn: (toColumnId: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function KanbanBoard({ columns, leads, dragState, onLeadClick, onStartDrag, onEndDrag, onDropOnColumn, onArchive, onDelete }: Props) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-3 pr-3">
      {columns.map((col) => {
        const columnLeads = leads.filter((l) => l.columnId === col.id);
        return (
          <KanbanColumn
            key={col.id} column={col} leads={columnLeads}
            isDragOver={dragState !== null && dragState.fromColumnId !== col.id}
            onLeadClick={onLeadClick} onStartDrag={onStartDrag} onEndDrag={onEndDrag}
            onDrop={() => onDropOnColumn(col.id)}
            onArchive={onArchive} onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
