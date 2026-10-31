"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Plus, Save, Trash2 } from "lucide-react";
import { MAP_COLS, MAP_ROWS, type ClinicMap, type MapShape } from "@/lib/clinicMap";
import { Card, EmptyState, Loading, Notice, btnClass, zs } from "@/presentation/ui/zs";

type Box = { id: string; name: string };
type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; orig: MapShape };

const AREA_PRESETS = ["Recepción", "Sala de espera", "Baño", "Pasillo", "Bodega"];

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Busca el primer hueco libre de w x h celdas en la grilla. */
function freeSpot(shapes: MapShape[], w: number, h: number) {
  const taken = (x: number, y: number) => shapes.some((s) => x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y);
  for (let y = 0; y + h <= MAP_ROWS; y++) for (let x = 0; x + w <= MAP_COLS; x++) if (!taken(x, y)) return { x, y };
  return { x: 0, y: 0 };
}

/**
 * Mapa de la clinica: un plano simple de la sede con sus boxes y areas. Se arrastra para mover,
 * la esquina cambia el tamaño y todo se ajusta a la grilla.
 */
export default function ClinicMapEditor({ canEdit }: { canEdit: boolean }) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [shapes, setShapes] = useState<MapShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [areaName, setAreaName] = useState("");
  const planeRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/boxes").then((r) => r.json()), fetch("/api/clinic-settings/clinic-map").then((r) => r.json())])
      .then(([b, m]) => {
        if (!b.ok) throw new Error(b.error);
        if (!m.ok) throw new Error(m.error);
        const list: Box[] = b.items.map((x: Box) => ({ id: x.id, name: x.name }));
        setBoxes(list);
        // Los boxes eliminados salen del mapa; los nombres se toman siempre del box.
        const ids = new Set(list.map((x) => x.id));
        setShapes(
          (m.map as ClinicMap).shapes
            .filter((s) => s.kind === "area" || ids.has(s.boxId ?? ""))
            .map((s) => (s.kind === "box" ? { ...s, label: list.find((x) => x.id === s.boxId)?.name ?? s.label } : s))
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No pudimos cargar el mapa."))
      .finally(() => setLoading(false));
  }, []);

  const unplaced = useMemo(() => boxes.filter((b) => !shapes.some((s) => s.boxId === b.id)), [boxes, shapes]);
  const current = shapes.find((s) => s.id === selected) ?? null;

  const change = (next: MapShape[]) => {
    setShapes(next);
    setDirty(true);
    setSaved(false);
  };

  const addShape = (shape: Omit<MapShape, "x" | "y">) => {
    const spot = freeSpot(shapes, shape.w, shape.h);
    const s = { ...shape, ...spot };
    change([...shapes, s]);
    setSelected(s.id);
  };

  const cell = useCallback(() => {
    const rect = planeRef.current?.getBoundingClientRect();
    return rect ? { w: rect.width / MAP_COLS, h: rect.height / MAP_ROWS } : { w: 1, h: 1 };
  }, []);

  const onPointerDown = (e: React.PointerEvent, shape: MapShape, mode: Drag["mode"]) => {
    setSelected(shape.id);
    if (!canEdit) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: shape.id, mode, startX: e.clientX, startY: e.clientY, orig: shape };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const c = cell();
    const dx = Math.round((e.clientX - d.startX) / c.w);
    const dy = Math.round((e.clientY - d.startY) / c.h);
    const o = d.orig;
    const next =
      d.mode === "move"
        ? { ...o, x: clamp(o.x + dx, 0, MAP_COLS - o.w), y: clamp(o.y + dy, 0, MAP_ROWS - o.h) }
        : { ...o, w: clamp(o.w + dx, 1, MAP_COLS - o.x), h: clamp(o.h + dy, 1, MAP_ROWS - o.y) };
    setShapes((prev) => prev.map((s) => (s.id === d.id ? next : s)));
    if (dx || dy) {
      setDirty(true);
      setSaved(false);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clinic-settings/clinic-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shapes }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar el mapa.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Cargando el mapa…" />;

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card
        title="Mapa de la clínica"
        action={
          canEdit ? (
            <button type="button" onClick={() => void save()} disabled={!dirty || saving} className={btnClass("primary", "sm")}>
              <Save className="h-4 w-4" strokeWidth={1.8} />
              {saving ? "Guardando…" : saved ? "Guardado" : "Guardar mapa"}
            </button>
          ) : null
        }
      >
        {error ? (
          <div className="mb-4">
            <Notice tone="err">{error}</Notice>
          </div>
        ) : null}
        <div
          ref={planeRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerDown={() => setSelected(null)}
          className="relative w-full touch-none select-none overflow-hidden rounded-[18px] border border-slate-200 bg-[#f4f7f9]"
          style={{
            aspectRatio: `${MAP_COLS} / ${MAP_ROWS}`,
            backgroundImage:
              "linear-gradient(to right, rgba(13,27,42,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,27,42,.06) 1px, transparent 1px)",
            backgroundSize: `${100 / MAP_COLS}% ${100 / MAP_ROWS}%`,
          }}
          role="application"
          aria-label="Plano de la clínica"
        >
          {shapes.map((s) => {
            const isSel = s.id === selected;
            return (
              <div
                key={s.id}
                onPointerDown={(e) => onPointerDown(e, s, "move")}
                className={`absolute flex items-center justify-center overflow-hidden rounded-xl border-2 p-1 text-center transition-shadow ${
                  s.kind === "box"
                    ? "border-[#50c9d5] bg-[#50c9d5]/20 text-slate-900"
                    : "border-dashed border-slate-400 bg-white/80 text-slate-600"
                } ${isSel ? "z-10 shadow-[0_0_0_3px_rgba(80,201,213,.35)]" : ""} ${canEdit ? "cursor-move" : "cursor-pointer"}`}
                style={{
                  left: `${(s.x / MAP_COLS) * 100}%`,
                  top: `${(s.y / MAP_ROWS) * 100}%`,
                  width: `${(s.w / MAP_COLS) * 100}%`,
                  height: `${(s.h / MAP_ROWS) * 100}%`,
                }}
              >
                <span className="pointer-events-none flex items-center gap-1 font-display text-[12px] font-semibold leading-tight sm:text-[13px]">
                  {s.kind === "box" ? <DoorOpen className="hidden h-3.5 w-3.5 shrink-0 sm:block" strokeWidth={1.8} /> : null}
                  <span className="line-clamp-2">{s.label}</span>
                </span>
                {canEdit && isSel ? (
                  <span
                    onPointerDown={(e) => onPointerDown(e, s, "resize")}
                    className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 cursor-se-resize rounded-[4px] border-2 border-[#1e737b] bg-white"
                    aria-label="Cambiar tamaño"
                  />
                ) : null}
              </div>
            );
          })}
          {!shapes.length ? (
            <div className="absolute inset-0 grid place-items-center">
              <EmptyState title="Tu plano está vacío">
                {canEdit ? "Agrega tus boxes y áreas desde el panel de la derecha." : "El administrador aún no dibuja el plano."}
              </EmptyState>
            </div>
          ) : null}
        </div>
        <p className={`${zs.small} mt-3`}>
          {canEdit ? "Arrastra para mover. Elige una figura y usa la esquina para cambiar su tamaño." : "Solo el administrador puede editar el plano."}
        </p>
      </Card>

      {canEdit ? (
        <div className="flex flex-col gap-6">
          <Card title="Boxes sin ubicar">
            {unplaced.length ? (
              <div className="flex flex-wrap gap-2">
                {unplaced.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => addShape({ id: uid(), kind: "box", boxId: b.id, label: b.name, w: 4, h: 3 })}
                    className={btnClass("ghost", "sm")}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    {b.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className={zs.small}>Todos tus boxes ya están en el plano.</p>
            )}
          </Card>

          <Card title="Agregar un área">
            <div className="flex flex-wrap gap-2">
              {AREA_PRESETS.map((name) => (
                <button key={name} type="button" onClick={() => addShape({ id: uid(), kind: "area", label: name, w: 5, h: 3 })} className={btnClass("quiet", "sm")}>
                  {name}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!areaName.trim()) return;
                addShape({ id: uid(), kind: "area", label: areaName.trim().slice(0, 40), w: 4, h: 3 });
                setAreaName("");
              }}
            >
              <input value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Otra área" className={`${zs.input} min-h-[38px] py-1.5`} maxLength={40} />
              <button type="submit" className={btnClass("primary", "sm")} disabled={!areaName.trim()}>
                Agregar
              </button>
            </form>
          </Card>

          {current ? (
            <Card title="Figura elegida">
              {current.kind === "area" ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-900">Nombre</span>
                  <input
                    value={current.label}
                    maxLength={40}
                    onChange={(e) => change(shapes.map((s) => (s.id === current.id ? { ...s, label: e.target.value } : s)))}
                    className={zs.input}
                  />
                </label>
              ) : (
                <p className="text-sm text-slate-600">
                  <b className="text-slate-900">{current.label}</b>: su nombre se cambia en la lista de boxes.
                </p>
              )}
              <p className={`${zs.small} mt-2`}>
                {current.w} × {current.h} celdas
              </p>
              <button
                type="button"
                onClick={() => {
                  change(shapes.filter((s) => s.id !== current.id));
                  setSelected(null);
                }}
                className={btnClass("danger", "sm", "mt-3")}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                Quitar del plano
              </button>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
