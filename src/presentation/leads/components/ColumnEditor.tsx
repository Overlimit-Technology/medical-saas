"use client";

import { useState } from "react";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

type Props = {
  columns: PipelineColumn[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
  onReorder: (columns: PipelineColumn[]) => void;
  onClose: () => void;
};

const PRESET_COLORS = [
  "#818cf8", "#6366f1", "#8b5cf6", "#a78bfa",
  "#3b82f6", "#60a5fa", "#06b6d4", "#14b8a6",
  "#10b981", "#22c55e", "#84cc16", "#eab308",
  "#f59e0b", "#f97316", "#ef4444", "#ec4899",
  "#6b7280", "#9ca3af", "#1a1a1a", "#78716c",
];

export default function ColumnEditor({ columns, onAdd, onUpdate, onDelete, onReorder, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#818cf8");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newColor);
    setNewName("");
  };

  const startEdit = (col: PipelineColumn) => {
    setEditingId(col.id);
    setEditName(col.name);
    setEditColor(col.color);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdate(editingId, editName.trim(), editColor);
    }
    setEditingId(null);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...columns];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#1a1a1a]/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-[#1a1a1a]/10 animate-modal-in max-h-[80vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Configurar Columnas</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#9c9690] hover:bg-[#f3f1ec] hover:text-[#6b6560]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Existing columns */}
        <div className="mb-5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9c9690]">Columnas actuales</p>
          <p className="text-[10px] text-[#9c9690]">Arrastra para reordenar</p>
          {columns.map((col, idx) => (
            <div
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 rounded-lg border border-[#e8e5df] bg-[#faf9f7] px-3 py-2 ${dragIdx === idx ? "opacity-50" : ""}`}
            >
              {/* Drag handle */}
              <span className="cursor-grab text-[#9c9690]">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>
              </span>

              {/* Color dot */}
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />

              {editingId === col.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-[#e8e5df] bg-white px-2 py-1 text-xs outline-none"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border border-[#e8e5df]"
                  />
                  <button type="button" onClick={saveEdit} className="text-[11px] font-medium text-emerald-600 hover:underline">OK</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-[11px] text-[#9c9690] hover:underline">X</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs font-medium text-[#1a1a1a]">{col.name}</span>
                  <button type="button" onClick={() => startEdit(col)} className="text-[11px] text-[#9c9690] hover:text-[#6b6560]">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (columns.length <= 1) return alert("Debe haber al menos una columna.");
                      if (confirm(`Eliminar columna "${col.name}"? Los leads se moveran a la primera columna.`)) onDelete(col.id);
                    }}
                    className="text-[11px] text-[#9c9690] hover:text-rose-500"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new column */}
        <div className="border-t border-[#e8e5df] pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9c9690]">Agregar columna</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="Nombre de la columna"
              className="flex-1 rounded-lg border border-[#e8e5df] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#9c9690]"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-lg border border-[#e8e5df]"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-xs font-medium text-white hover:bg-[#333] disabled:bg-[#e8e5df] disabled:text-[#9c9690]"
            >
              Agregar
            </button>
          </div>

          {/* Preset colors */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full border-2 transition ${newColor === c ? "border-[#1a1a1a] scale-110" : "border-transparent hover:scale-105"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
