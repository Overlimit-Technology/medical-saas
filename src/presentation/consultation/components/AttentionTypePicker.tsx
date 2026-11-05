"use client";

/**
 * Tarjetas de tipo de atencion. La sugerida viene marcada (la que eligio recepcion, o la mas probable
 * segun las atenciones anteriores), pero el profesional siempre puede elegir otra.
 * En "Ordenar" se ocultan, reordenan, duplican y editan; "+" crea un tipo propio.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Clock, Copy, Eye, EyeOff, Pencil, Plus, Settings2, Sparkles, Trash2, UserRoundCheck } from "lucide-react";
import { NOTE_FORMATS, type AttentionTypeDef } from "@/lib/clinical/attentionTypes";
import { flipFrom, measure, tilesIn } from "@/presentation/ui/fx";
import { toast } from "@/presentation/ui/toast";
import AttentionTypeEditor from "./AttentionTypeEditor";

export type PickerType = AttentionTypeDef & { hidden: boolean; position: number; editable: boolean };

type Props = {
  types: PickerType[];
  selectedKey: string | null;
  suggestedKey: string | null;
  preselectedKey: string | null;
  canManage: boolean;
  canShare: boolean;
  onSelect: (key: string) => void;
  onTypesChange: (types: PickerType[]) => void;
};

async function savePrefs(types: PickerType[]) {
  await fetch("/api/attention-types", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: types.map((t, i) => ({ key: t.key, hidden: t.hidden, position: i })) }),
  });
}

async function reload(): Promise<PickerType[] | null> {
  const res = await fetch("/api/attention-types");
  const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: { types: PickerType[] } } | null;
  return data?.ok && data.item ? data.item.types : null;
}

export default function AttentionTypePicker({ types, selectedKey, suggestedKey, preselectedKey, canManage, canShare, onSelect, onTypesChange }: Props) {
  const [managing, setManaging] = useState(false);
  const [editor, setEditor] = useState<{ mode: "create" | "edit" | "duplicate"; source: AttentionTypeDef | null } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);

  useEffect(() => tilesIn(gridRef.current?.querySelectorAll("[data-card]")), []);

  // FLIP al reordenar, ocultar o entrar a "Ordenar".
  const cards = () => Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
  const snapshot = () => (before.current = measure(cards(), (el) => el.dataset.card!));
  useLayoutEffect(() => {
    if (!before.current) return;
    flipFrom(before.current, cards(), (el) => el.dataset.card!);
    before.current = null;
  });

  const visible = managing ? types : types.filter((t) => !t.hidden);

  const update = (next: PickerType[]) => {
    snapshot();
    onTypesChange(next);
    void savePrefs(next);
  };
  const moveBy = (key: string, delta: number) => {
    const i = types.findIndex((t) => t.key === key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= types.length) return;
    const next = [...types];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const toggleHidden = (key: string) => update(types.map((t) => (t.key === key ? { ...t, hidden: !t.hidden } : t)));

  const remove = async (type: PickerType) => {
    const res = await fetch(`/api/attention-types/${type.key.slice(7)}`, { method: "DELETE" });
    if (!res.ok) return toast("No se pudo eliminar el tipo.");
    snapshot();
    onTypesChange(types.filter((t) => t.key !== type.key));
    toast(`"${type.name}" eliminado. Las sesiones ya registradas no cambian.`);
  };

  const onSaved = async (saved: AttentionTypeDef) => {
    setEditor(null);
    const fresh = await reload();
    snapshot();
    if (fresh) onTypesChange(fresh);
    onSelect(saved.key);
    toast(`"${saved.name}" listo.`);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">Que tipo de atencion es?</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              snapshot();
              setManaging((m) => !m);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${managing ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <Settings2 size={13} /> {managing ? "Listo" : "Ordenar"}
          </button>
        )}
      </div>

      <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((type, index) => {
          const selected = type.key === selectedKey;
          const suggested = type.key === suggestedKey;
          const fromReception = type.key === preselectedKey;
          return (
            <div key={type.key} data-card={type.key} className={`group relative ${type.hidden ? "opacity-50" : ""}`}>
              <button
                type="button"
                disabled={managing}
                onClick={() => onSelect(type.key)}
                aria-pressed={selected}
                className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white p-4 pl-5 text-left transition-all duration-200 disabled:cursor-default ${
                  selected ? "border-transparent shadow-lg ring-2 ring-[#50c9d5]" : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                }`}
                style={selected ? { boxShadow: `0 12px 28px -12px ${type.color}66` } : undefined}
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: type.color }} />
                <span className="flex items-start gap-2">
                  <span className="flex-1 text-sm font-semibold leading-snug text-slate-900">{type.name}</span>
                  {selected && (
                    <span className="animate-pop-in flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#50c9d5] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </span>
                {type.description && <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{type.description}</span>}
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {type.durationMinutes} min
                  </span>
                  <span>· {NOTE_FORMATS[type.noteFormat].label}</span>
                  {type.custom && <span>· {type.shared ? "Del equipo" : "Propio"}</span>}
                </span>
                {(fromReception || suggested) && !managing && (
                  <span className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${fromReception ? "bg-amber-50 text-amber-700" : "bg-[#50c9d5]/12 text-[#1e737b]"}`}>
                    {fromReception ? <UserRoundCheck size={10} /> : <Sparkles size={10} />}
                    {fromReception ? "Elegida en recepcion" : "Sugerida"}
                  </span>
                )}
              </button>

              {managing && (
                <div className="absolute right-2 top-2 flex gap-0.5 rounded-xl bg-white/95 p-0.5 shadow-sm ring-1 ring-slate-100">
                  <Tool label="Subir" onClick={() => moveBy(type.key, -1)} disabled={index === 0}><ArrowUp size={13} /></Tool>
                  <Tool label="Bajar" onClick={() => moveBy(type.key, 1)} disabled={index === visible.length - 1}><ArrowDown size={13} /></Tool>
                  <Tool label={type.hidden ? "Mostrar" : "Ocultar"} onClick={() => toggleHidden(type.key)}>{type.hidden ? <Eye size={13} /> : <EyeOff size={13} />}</Tool>
                  <Tool label="Duplicar" onClick={() => setEditor({ mode: "duplicate", source: type })}><Copy size={13} /></Tool>
                  {type.editable && (
                    <>
                      <Tool label="Editar" onClick={() => setEditor({ mode: "edit", source: type })}><Pencil size={13} /></Tool>
                      <Tool label="Eliminar" onClick={() => void remove(type)}><Trash2 size={13} /></Tool>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {canManage && (
          <button
            type="button"
            data-card="__new"
            onClick={() => setEditor({ mode: "create", source: null })}
            className="flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition-all hover:-translate-y-0.5 hover:border-[#50c9d5] hover:text-[#1e737b]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-[#50c9d5]/10">
              <Plus size={18} />
            </span>
            Crear tipo de atencion
          </button>
        )}
      </div>

      {editor && <AttentionTypeEditor mode={editor.mode} source={editor.source} canShare={canShare} onClose={() => setEditor(null)} onSaved={(t) => void onSaved(t)} />}
    </div>
  );
}

function Tool({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30">
      {children}
    </button>
  );
}
