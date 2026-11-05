"use client";

/**
 * Editor de un tipo de atencion propio ("+" en las tarjetas, o duplicar/editar uno existente):
 * nombre, duracion, color, formato de nota y bloques con campos (texto, numero, si/no, lista,
 * lista multiple, escala y fecha). Editar sube la version; las sesiones ya registradas conservan
 * la estructura con que se guardaron.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { NOTE_FORMATS, NOTE_FORMAT_KEYS, type AttentionBlock, type AttentionField, type AttentionFieldKind, type AttentionTypeDef, type NoteFormat } from "@/lib/clinical/attentionTypes";
import { popIn } from "@/presentation/ui/fx";

const KIND_LABEL: Record<AttentionFieldKind, string> = {
  text: "Texto corto",
  longtext: "Texto largo",
  number: "Numero",
  checkbox: "Si / no",
  list: "Lista (una opcion)",
  checklist: "Lista (varias)",
  scale: "Escala",
  date: "Fecha",
};

const COLORS = ["#50c9d5", "#6250d6", "#eda100", "#16a34a", "#e11d48", "#0ea5e9", "#f97316", "#64748b"];
const KINDS: Array<{ key: AttentionTypeDef["kind"]; label: string }> = [
  { key: "first", label: "Primera vez" },
  { key: "followup", label: "Seguimiento" },
  { key: "procedure", label: "Procedimiento" },
  { key: "closure", label: "Cierre / alta" },
  { key: "other", label: "Otro" },
];

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type Draft = {
  name: string;
  description: string;
  kind: AttentionTypeDef["kind"];
  noteFormat: NoteFormat;
  durationMinutes: number;
  color: string;
  shared: boolean;
  blocks: AttentionBlock[];
};

type Props = {
  /** Tipo a editar (propio) o a duplicar (cualquiera). null = nuevo. */
  source: AttentionTypeDef | null;
  mode: "create" | "edit" | "duplicate";
  canShare: boolean;
  onClose: () => void;
  onSaved: (type: AttentionTypeDef) => void;
};

function initial(source: AttentionTypeDef | null, mode: Props["mode"]): Draft {
  if (!source) {
    return {
      name: "",
      description: "",
      kind: "other",
      noteFormat: "free",
      durationMinutes: 45,
      color: COLORS[0],
      shared: false,
      blocks: [{ id: uid("b"), title: "Datos de la sesion", fields: [{ id: uid("f"), label: "Observaciones", kind: "longtext" }] }],
    };
  }
  return {
    name: mode === "duplicate" ? `${source.name} (copia)` : source.name,
    description: source.description ?? "",
    kind: source.kind,
    noteFormat: source.noteFormat,
    durationMinutes: source.durationMinutes,
    color: source.color,
    shared: mode === "edit" ? Boolean(source.shared) : false,
    blocks: JSON.parse(JSON.stringify(source.blocks)) as AttentionBlock[],
  };
}

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-[#50c9d5] focus:outline-none focus:ring-2 focus:ring-[#50c9d5]/15";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export default function AttentionTypeEditor({ source, mode, canShare, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => initial(source, mode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => popIn(panelRef.current, { from: 0.94 }), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setBlock = (b: number, patch: Partial<AttentionBlock>) => setDraft((d) => ({ ...d, blocks: d.blocks.map((x, i) => (i === b ? { ...x, ...patch } : x)) }));
  const setField = (b: number, f: number, patch: Partial<AttentionField>) =>
    setBlock(b, { fields: draft.blocks[b].fields.map((x, i) => (i === f ? { ...x, ...patch } : x)) });
  const move = <T,>(list: T[], from: number, to: number) => {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      ...draft,
      blocks: draft.blocks
        .map((b) => ({ ...b, fields: b.fields.filter((f) => f.label.trim()) }))
        .filter((b) => b.title.trim() && b.fields.length),
    };
    const editing = mode === "edit" && source?.key.startsWith("custom:");
    const res = await fetch(editing ? `/api/attention-types/${source!.key.slice(7)}` : "/api/attention-types", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: AttentionTypeDef; error?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.ok || !data.item) return setError(data?.error ?? "No se pudo guardar.");
    onSaved(data.item);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Tipo de atencion" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <span className="h-3 w-3 rounded-full" style={{ background: draft.color }} />
          <h2 className="flex-1 text-base font-semibold text-slate-900">
            {mode === "edit" ? "Editar tipo de atencion" : mode === "duplicate" ? "Duplicar tipo de atencion" : "Nuevo tipo de atencion"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <label className="block">
              <span className={label}>Nombre</span>
              <input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Drenaje linfatico" className={input} autoFocus />
            </label>
            <label className="block">
              <span className={label}>Duracion</span>
              <div className="relative">
                <input type="number" min={5} max={480} value={draft.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value) || 45)} className={`${input} pr-11`} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span>
              </div>
            </label>
          </div>
          <label className="block">
            <span className={label}>Descripcion corta</span>
            <input value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Lo que se ve en la tarjeta" className={input} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={label}>Tipo</span>
              <select value={draft.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])} className={input}>
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Formato de nota</span>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_FORMAT_KEYS.map((f) => (
                  <button key={f} type="button" onClick={() => set("noteFormat", f)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${draft.noteFormat === f ? "border-[#50c9d5] bg-[#50c9d5] text-[#080b04]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    {NOTE_FORMATS[f].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className={label}>Color</span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => set("color", c)} className={`h-8 w-8 rounded-full transition-transform ${draft.color === c ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : "hover:scale-105"}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={label}>Bloques y campos</span>
              <button type="button" onClick={() => set("blocks", [...draft.blocks, { id: uid("b"), title: "Bloque nuevo", fields: [{ id: uid("f"), label: "", kind: "text" }] }])} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e737b] hover:underline">
                <Plus size={13} /> Bloque
              </button>
            </div>

            {draft.blocks.map((block, b) => (
              <section key={block.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2">
                  <input value={block.title} onChange={(e) => setBlock(b, { title: e.target.value })} className={`${input} font-semibold`} aria-label="Titulo del bloque" />
                  <IconBtn label="Subir bloque" onClick={() => set("blocks", move(draft.blocks, b, b - 1))}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Bajar bloque" onClick={() => set("blocks", move(draft.blocks, b, b + 1))}><ArrowDown size={14} /></IconBtn>
                  <IconBtn label="Quitar bloque" onClick={() => set("blocks", draft.blocks.filter((_, i) => i !== b))}><Trash2 size={14} /></IconBtn>
                </div>

                <div className="mt-3 space-y-2">
                  {block.fields.map((field, f) => (
                    <div key={field.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                        <input value={field.label} onChange={(e) => setField(b, f, { label: e.target.value })} placeholder="Nombre del campo" className={input} aria-label="Nombre del campo" />
                        <select value={field.kind} onChange={(e) => setField(b, f, { kind: e.target.value as AttentionFieldKind, ...(e.target.value === "scale" ? { min: 0, max: 10 } : {}) })} className={input} aria-label="Tipo de campo">
                          {(Object.keys(KIND_LABEL) as AttentionFieldKind[]).map((k) => (
                            <option key={k} value={k}>{KIND_LABEL[k]}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <IconBtn label="Subir campo" onClick={() => setBlock(b, { fields: move(block.fields, f, f - 1) })}><ArrowUp size={14} /></IconBtn>
                          <IconBtn label="Bajar campo" onClick={() => setBlock(b, { fields: move(block.fields, f, f + 1) })}><ArrowDown size={14} /></IconBtn>
                          <IconBtn label="Quitar campo" onClick={() => setBlock(b, { fields: block.fields.filter((_, i) => i !== f) })}><Trash2 size={14} /></IconBtn>
                        </div>
                      </div>
                      {(field.kind === "list" || field.kind === "checklist") && (
                        <input
                          defaultValue={(field.options ?? []).join(", ")}
                          onBlur={(e) => setField(b, f, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 20) })}
                          placeholder="Opciones separadas por coma"
                          className={`${input} mt-2`}
                          aria-label="Opciones"
                        />
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {field.kind === "number" && (
                          <input value={field.unit ?? ""} onChange={(e) => setField(b, f, { unit: e.target.value.slice(0, 12) || undefined })} placeholder="Unidad (kg, cm...)" className={`${input} max-w-[160px]`} aria-label="Unidad" />
                        )}
                        {field.kind === "scale" && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            De
                            <input type="number" value={field.min ?? 0} onChange={(e) => setField(b, f, { min: Number(e.target.value) })} className={`${input} w-16`} aria-label="Minimo" />
                            a
                            <input type="number" value={field.max ?? 10} onChange={(e) => setField(b, f, { max: Math.min(20, Number(e.target.value)) })} className={`${input} w-16`} aria-label="Maximo" />
                          </span>
                        )}
                        {field.kind !== "longtext" && (
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <input type="checkbox" checked={Boolean(field.carry)} onChange={(e) => setField(b, f, { carry: e.target.checked })} className="accent-[#50c9d5]" />
                            Mostrar el valor anterior
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setBlock(b, { fields: [...block.fields, { id: uid("f"), label: "", kind: "text" }] })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-[#50c9d5] hover:text-[#1e737b]">
                    <Plus size={12} /> Campo
                  </button>
                </div>
              </section>
            ))}
          </div>

          {canShare && (
            <label className="flex items-start gap-2.5 rounded-2xl border border-slate-100 p-4 text-sm text-slate-600">
              <input type="checkbox" checked={draft.shared} onChange={(e) => set("shared", e.target.checked)} className="mt-0.5 accent-[#50c9d5]" />
              <span>
                <span className="font-semibold text-slate-800">Compartir con el equipo de la especialidad</span>
                <span className="block text-xs text-slate-400">Los demas profesionales de esta especialidad en la sede tambien veran esta tarjeta.</span>
              </span>
            </label>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
          {error && <p className="flex-1 text-sm text-rose-600">{error}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
              Cancelar
            </button>
            <button type="button" onClick={() => void save()} disabled={busy || draft.name.trim().length < 2} className="inline-flex items-center gap-2 rounded-full bg-[#50c9d5] px-5 py-2.5 text-sm font-semibold text-[#080b04] hover:bg-[#45bcc8] disabled:opacity-50">
              {busy && <Loader2 size={15} className="animate-spin" />} Guardar tipo
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function IconBtn({ children, label: aria, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={aria} title={aria} onClick={onClick} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
      {children}
    </button>
  );
}
