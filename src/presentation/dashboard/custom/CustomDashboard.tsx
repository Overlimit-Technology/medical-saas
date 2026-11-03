"use client";

/**
 * Vista general del admin como panel de widgets, al estilo de la pantalla de inicio del iPhone:
 * en modo editar los widgets tiemblan, se arrastran para reordenarlos, se cambian de tamaño desde
 * los bordes y esquinas (enganchandose a 1x1, 2x1, 2x2, 4x1 o 4x2), se quitan con "–" y se
 * añaden desde una galeria que sube desde abajo. El diseño se guarda solo, por usuario y sede.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Building2, ChevronLeft, ChevronRight, Plus, RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
import { chileDateString } from "@/lib/chileTime";
import { DEFAULT_LAYOUT, GRID, METRIC_BY_ID, isTool, newWidget, normalizeWidget, spanFits, type DashboardLayout, type MetricResult, type Span, type WidgetConfig } from "@/lib/dashboard/catalog";
import { OFFSET_MAX, OFFSET_MIN, PERIODS, PERIOD_LABEL, resolvePeriod, type PeriodKey } from "@/lib/dashboard/period";
import { Card, EmptyState, Loading, Notice, PageHead, Segmented, View, btnClass } from "@/presentation/ui/zs";
import { WidgetEditor } from "./Panels";
import WidgetCard, { type WidgetData } from "./WidgetCard";
import WidgetGallery, { DRAG_MIME, type NewWidgetDrop } from "./WidgetGallery";
import { colsForWidth, largestHole, occupied, pack, type Placement } from "@/lib/dashboard/pack";

type SaveState = "idle" | "saving" | "saved" | "error";
type MetricMap = Record<string, MetricResult | { error: string }>;
type DragState = { id: string; pointerId: number; startX: number; startY: number; offX: number; offY: number; active: boolean; x: number; y: number };

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cacheKey = (period: PeriodKey, offset: number) => `${period}:${offset}`;
const PLACEHOLDER = "__nuevo__";
const ADD_TILE = "__añadir__";

/** Indice donde cae un punto de la grilla: antes o despues de la tarjeta bajo el puntero. */
function indexAt(grid: HTMLElement, x: number, y: number, skipId?: string): number | null {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-wid]")).filter((el) => el.dataset.wid !== skipId && el.dataset.wid !== PLACEHOLDER);
  const g = grid.getBoundingClientRect();
  for (let i = 0; i < cards.length; i++) {
    const el = cards[i];
    const left = g.left + el.offsetLeft;
    const top = g.top + el.offsetTop;
    if (x >= left && x <= left + el.offsetWidth && y >= top && y <= top + el.offsetHeight) {
      return x > left + el.offsetWidth / 2 ? i + 1 : i;
    }
  }
  return null;
}

type Geometry = { cols: number; gap: number; colW: number; rowH: number; left: number; top: number };

function geometry(grid: HTMLElement): Geometry {
  const cs = getComputedStyle(grid);
  const cols = colsForWidth(grid.clientWidth);
  const gap = parseFloat(cs.columnGap) || 16;
  const rowH = parseFloat(cs.gridAutoRows) || 176;
  const r = grid.getBoundingClientRect();
  return { cols, gap, colW: (grid.clientWidth - gap * (cols - 1)) / cols, rowH, left: r.left, top: r.top };
}

/** Espacio en blanco bajo el puntero, sin contar la tarjeta que se arrastra (su lugar tambien queda libre). */
function holeAt(grid: HTMLElement, placements: Map<string, Placement>, x: number, y: number, skipId: string): Placement | null {
  const geo = geometry(grid);
  const others = Array.from(placements.entries())
    .filter(([id]) => id !== skipId && id !== PLACEHOLDER && id !== ADD_TILE)
    .map(([, p]) => p);
  const { taken, rows } = occupied(others);
  const col = Math.floor((x - geo.left) / (geo.colW + geo.gap));
  const row = Math.floor((y - geo.top) / (geo.rowH + geo.gap));
  return largestHole(taken, rows, geo.cols, col, row);
}

export default function CustomDashboard() {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [galleryDragging, setGalleryDragging] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropSpan, setDropSpan] = useState<Span>({ w: 2, h: 1 });
  const [configId, setConfigId] = useState<string | null>(null);
  const [resize, setResize] = useState<{ id: string; span: Span } | null>(null);
  const resizeRef = useRef<{ id: string; span: Span } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [slot, setSlot] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  /** Espacio en blanco bajo el puntero: al soltar, el widget toma su forma. */
  const [hole, setHole] = useState<Placement | null>(null);
  const holeRef = useRef<Placement | null>(null);
  /** Donde estaba la tarjeta al soltarla, para que llegue deslizandose a su lugar nuevo. */
  const dropFrom = useRef<{ id: string; left: number; top: number } | null>(null);
  const [cache, setCache] = useState<Record<string, MetricMap>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(new Set<string>());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  const gridShown = Boolean(layout && (layout.widgets.length || editing));
  const placementsRef = useRef<Map<string, Placement>>(new Map());
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => setCols(colsForWidth(grid.clientWidth)));
    ro.observe(grid);
    return () => ro.disconnect();
    // La grilla aparece cuando hay widgets o se entra al modo editar.
  }, [gridShown]);
  const layoutRef = useRef<DashboardLayout | null>(null);
  layoutRef.current = layout;

  // -------------------------------------------------------------------------
  // Diseño: carga y guardado automatico
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/dashboard/layout", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error);
        setLayout(json.data.layout);
        setClinicName(json.data.clinicName);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No pudimos cargar tu panel.");
        setLayout(DEFAULT_LAYOUT);
      });
  }, []);

  const persist = useCallback((next: DashboardLayout) => {
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/dashboard/layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);
  }, []);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  /** Cambia el diseño y lo guarda (con una pausa, para no guardar en cada movimiento). */
  const change = useCallback(
    (fn: (prev: DashboardLayout) => DashboardLayout) => {
      setLayout((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateWidget = (next: WidgetConfig) => change((l) => ({ ...l, widgets: l.widgets.map((w) => (w.id === next.id ? next : w)) }));
  const removeWidget = (id: string) => {
    setConfigId(null);
    change((l) => ({ ...l, widgets: l.widgets.filter((w) => w.id !== id) }));
  };
  const moveWidget = (id: string, dir: -1 | 1) =>
    change((l) => {
      const i = l.widgets.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.widgets.length) return l;
      const widgets = [...l.widgets];
      [widgets[i], widgets[j]] = [widgets[j], widgets[i]];
      return { ...l, widgets };
    });
  const insertWidget = (drop: NewWidgetDrop, index?: number) => {
    const widget = newWidget(drop.metric, drop.chart, drop.span);
    change((l) => {
      const widgets = [...l.widgets];
      widgets.splice(index ?? widgets.length, 0, widget);
      return { ...l, widgets };
    });
    setGallery(false);
    setTimeout(() => document.getElementById(`widget-${widget.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  };
  const duplicateWidget = (id: string) =>
    change((l) => {
      const i = l.widgets.findIndex((w) => w.id === id);
      if (i < 0) return l;
      const copy = { ...l.widgets[i], id: newWidget(l.widgets[i].metric).id };
      const widgets = [...l.widgets];
      widgets.splice(i + 1, 0, copy);
      return { ...l, widgets };
    });
  const resetLayout = async () => {
    if (!window.confirm("¿Volver al panel por defecto? Se perderán tus widgets y ajustes.")) return;
    clearTimeout(saveTimer.current);
    setLayout(DEFAULT_LAYOUT);
    setOffset(0);
    setConfigId(null);
    const res = await fetch("/api/dashboard/layout", { method: "DELETE" }).catch(() => null);
    setSaveState(res?.ok ? "saved" : "error");
  };

  // -------------------------------------------------------------------------
  // Reordenar arrastrando (puntero: mouse, lapiz o dedo)
  // -------------------------------------------------------------------------

  const onDragPointerDown = (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a, [data-handle]")) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    setDrag({ id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, active: false, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const active = drag.active || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6;
      if (!active) return;
      e.preventDefault();
      const grid = gridRef.current;
      if (grid) {
        const to = indexAt(grid, e.clientX, e.clientY, drag.id);
        const dragged = layoutRef.current?.widgets.find((w) => w.id === drag.id);
        const found = to === null && dragged ? holeAt(grid, placementsRef.current, e.clientX, e.clientY, drag.id) : null;
        const usable = found && dragged && spanFits(dragged.chart, found) ? found : null;
        if (usable?.x !== holeRef.current?.x || usable?.y !== holeRef.current?.y || usable?.w !== holeRef.current?.w || usable?.h !== holeRef.current?.h) {
          holeRef.current = usable;
          setHole(usable);
        }
        if (to !== null) {
          setLayout((l) => {
            if (!l) return l;
            const from = l.widgets.findIndex((w) => w.id === drag.id);
            const rest = l.widgets.filter((w) => w.id !== drag.id);
            if (from < 0 || to === from) return l;
            rest.splice(to, 0, { ...l.widgets[from], x: null, y: null });
            return rest.every((w, i) => w.id === l.widgets[i].id) ? l : { ...l, widgets: rest };
          });
        }
      }
      setDrag((d) => (d ? { ...d, active: true, x: e.clientX, y: e.clientY } : d));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const grid = gridRef.current;
      const el = grid?.querySelector<HTMLElement>(`[data-wid="${drag.id}"]`);
      if (drag.active && el) {
        const r = el.getBoundingClientRect();
        dropFrom.current = { id: drag.id, left: r.left, top: r.top };
      }
      const target = holeRef.current;
      if (drag.active && target && grid && layoutRef.current) {
        const gridCols = geometry(grid).cols;
        change((l) => {
          const moving = l.widgets.find((w) => w.id === drag.id);
          if (!moving) return l;
          // Con 2 columnas, llenar la fila no achica un widget que en escritorio es mas ancho.
          const w = gridCols < GRID.cols && target.w >= gridCols ? Math.max(moving.w, gridCols) : target.w;
          const pinned = gridCols >= GRID.cols ? { x: target.x, y: target.y } : { x: null, y: null };
          const resized = normalizeWidget({ ...moving, w, h: target.h, ...pinned });
          return { ...l, widgets: l.widgets.map((x) => (x.id === drag.id ? resized : x)) };
        });
      } else if (drag.active && layoutRef.current) {
        persist(layoutRef.current);
      }
      holeRef.current = null;
      setHole(null);
      setDrag(null);
      setSlot(null);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, persist, change]);

  // La tarjeta arrastrada sigue al puntero; su lugar en la grilla queda marcado.
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  dragOffsetRef.current = dragOffset;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!drag?.active || !grid) {
      setDragOffset(null);
      return;
    }
    const el = grid.querySelector<HTMLElement>(`[data-wid="${drag.id}"]`);
    if (!el) return;
    const g = grid.getBoundingClientRect();
    setDragOffset({ x: drag.x - drag.offX - (g.left + el.offsetLeft), y: drag.y - drag.offY - (g.top + el.offsetTop) });
    setSlot({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  }, [drag, layout]);

  // -------------------------------------------------------------------------
  // Animacion suave cuando los demas widgets se reacomodan (FLIP)
  // -------------------------------------------------------------------------

  const positions = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    grid.querySelectorAll<HTMLElement>("[data-wid]").forEach((el) => {
      const id = el.dataset.wid!;
      const now = { x: el.offsetLeft, y: el.offsetTop };
      const before = positions.current.get(id);
      const isDragged = drag?.active && drag.id === id;
      if (dropFrom.current?.id === id && !isDragged) {
        const from = dropFrom.current;
        dropFrom.current = null;
        const r = el.getBoundingClientRect();
        if (!reduce) {
          el.animate([{ translate: `${from.left - r.left}px ${from.top - r.top}px`, scale: "1.03" }, { translate: "0px 0px", scale: "1" }], {
            duration: 300,
            easing: "cubic-bezier(.22,1,.36,1)",
          });
        }
      } else if (before && !reduce && !isDragged && (before.x !== now.x || before.y !== now.y)) {
        el.animate([{ translate: `${before.x - now.x}px ${before.y - now.y}px` }, { translate: "0px 0px" }], {
          duration: 300,
          easing: "cubic-bezier(.22,1,.36,1)",
        });
      }
      positions.current.set(id, now);
    });
  });

  // -------------------------------------------------------------------------
  // Soltar en la grilla un widget arrastrado desde la galeria
  // -------------------------------------------------------------------------

  const onGridDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!galleryDragging || !gridRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const at = indexAt(gridRef.current, e.clientX, e.clientY);
    setDropIndex(at ?? layout?.widgets.length ?? 0);
  };
  const onGridDrop = (e: DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    e.preventDefault();
    try {
      insertWidget(JSON.parse(raw) as NewWidgetDrop, dropIndex ?? undefined);
    } catch {
      // un arrastre ajeno al panel se ignora
    }
    setGalleryDragging(false);
    setDropIndex(null);
  };

  // -------------------------------------------------------------------------
  // Datos: un pedido por periodo, solo con las metricas que faltan
  // -------------------------------------------------------------------------

  const today = chileDateString(new Date());
  const period = layout?.period ?? DEFAULT_LAYOUT.period;
  const range = useMemo(() => resolvePeriod(period, offset, today), [period, offset, today]);
  const effective = useCallback((w: WidgetConfig) => (w.period ? { period: w.period, offset: 0 } : { period, offset }), [period, offset]);

  useEffect(() => {
    if (!layout) return;
    const groups = new Map<string, { period: PeriodKey; offset: number; metrics: Set<string> }>();
    for (const w of layout.widgets) {
      // Las herramientas (archivos, acceso directo) no piden datos al servidor.
      if (!METRIC_BY_ID.has(w.metric) || isTool(w.metric)) continue;
      const e = effective(w);
      const key = cacheKey(e.period, e.offset);
      if (!groups.has(key)) groups.set(key, { ...e, metrics: new Set() });
      groups.get(key)!.metrics.add(w.metric);
    }
    for (const [key, g] of Array.from(groups)) {
      const missing = Array.from(g.metrics).filter((id) => !cache[key]?.[id] && !inFlight.current.has(`${key}|${id}`));
      if (!missing.length) continue;
      missing.forEach((id) => inFlight.current.add(`${key}|${id}`));
      const qs = new URLSearchParams({ period: g.period, offset: String(g.offset), metrics: missing.join(",") });
      fetch(`/api/dashboard/widgets?${qs}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (!json.ok) throw new Error(json.error);
          setFetchError(null);
          setCache((c) => ({ ...c, [key]: { ...c[key], ...json.data.metrics } }));
        })
        .catch((err) => {
          setFetchError(err instanceof Error ? err.message : "No pudimos cargar los datos.");
          const failed = Object.fromEntries(missing.map((id) => [id, { error: "No se pudo cargar." }]));
          setCache((c) => ({ ...c, [key]: { ...c[key], ...failed } }));
        })
        .finally(() => {
          missing.forEach((id) => inFlight.current.delete(`${key}|${id}`));
          setRefreshing(false);
        });
    }
  }, [layout, cache, effective]);

  const refresh = () => {
    setRefreshing(true);
    setCache({});
  };

  /**
   * Mientras llegan los datos de otro periodo, el widget sigue mostrando los ultimos que tuvo: asi
   * las cifras cuentan del valor anterior al nuevo y los graficos se redibujan sin pasar por el esqueleto.
   */
  const shown = useRef(new Map<string, WidgetData>());
  const dataFor = (w: WidgetConfig): WidgetData => {
    const e = effective(w);
    const fresh = cache[cacheKey(e.period, e.offset)]?.[w.metric];
    const key = `${w.id}|${w.metric}`;
    if (fresh !== undefined && !("error" in fresh)) shown.current.set(key, fresh);
    return fresh ?? shown.current.get(key);
  };

  // -------------------------------------------------------------------------
  // Vista
  // -------------------------------------------------------------------------

  const placements = useMemo(() => {
    if (!layout) return new Map<string, Placement>();
    const items = layout.widgets.map((w) => (resize?.id === w.id ? { ...w, ...resize.span } : w));
    if (galleryDragging && dropIndex !== null) items.splice(Math.min(dropIndex, items.length), 0, { ...dropSpan, id: PLACEHOLDER } as WidgetConfig);
    if (editing && !galleryDragging) items.push({ id: ADD_TILE, w: 1, h: 1 } as WidgetConfig);
    return pack(items, cols);
  }, [layout, resize, galleryDragging, dropIndex, dropSpan, editing, cols]);
  placementsRef.current = placements;

  const todayLabel = capFirst(new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }));
  const configWidget = layout?.widgets.find((w) => w.id === configId) ?? null;
  const configIndex = layout && configWidget ? layout.widgets.indexOf(configWidget) : -1;
  const inUse = useMemo(() => new Set(layout?.widgets.map((w) => w.metric) ?? []), [layout]);
  const saveText = { idle: null, saving: "Guardando…", saved: "Cambios guardados", error: "No se pudo guardar" }[saveState];

  const finishEditing = () => {
    setEditing(false);
    setResize(null);
    setGallery(false);
  };

  return (
    <View label="Vista general" wide>
      <PageHead
        tag={clinicName ? `${todayLabel} · ${clinicName}` : todayLabel}
        title="Vista"
        accent="general"
        lead="Tu panel, a tu manera: elige qué cifras ver, de qué tamaño y en qué orden."
        actions={
          editing ? null : (
            <>
              <a href="/clinic-dashboard/clinica" className={btnClass("quiet", "sm")}>
                <Building2 className="h-4 w-4" strokeWidth={1.8} />
                Mi clínica
              </a>
              <button type="button" onClick={refresh} disabled={refreshing} className={btnClass("quiet", "sm")}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.8} />
                Actualizar
              </button>
              <button type="button" onClick={() => setEditing(true)} className={btnClass("primary", "sm")}>
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
                Editar panel
              </button>
            </>
          )
        }
      />

      {editing ? (
        // Barra del modo editar: "+" para añadir y "Listo" para salir, siempre a la vista.
        <div className="zs-glass-strong zs-modal-in sticky top-0 z-30 -mx-1 flex flex-wrap items-center gap-3 rounded-[24px] px-3 py-2.5">
          <button
            type="button"
            onClick={() => setGallery(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#50c9d5] text-[#080b04] shadow-[0_10px_24px_rgba(80,201,213,.4)] transition hover:-translate-y-0.5"
            aria-label="Añadir widget"
            title="Añadir widget"
          >
            <Plus className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <p className="min-w-[200px] flex-1 text-[13.5px] leading-snug text-slate-600">
            <b className="font-semibold text-slate-900">Modo editar.</b> Arrastra para mover, usa los bordes para cambiar el tamaño y{" "}
            <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-slate-700 align-[-2px] text-[10px] font-bold text-white">–</span> para quitar.
          </p>
          {saveText ? (
            <span className={`text-xs ${saveState === "error" ? "text-[#b91c1c]" : "text-slate-500"}`} role="status">
              {saveText}
            </span>
          ) : null}
          <button type="button" className={btnClass("quiet", "sm")} onClick={() => void resetLayout()}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
            Restablecer
          </button>
          <button type="button" className={btnClass("primary", "sm")} onClick={finishEditing}>
            Listo
          </button>
        </div>
      ) : (
        // Filtros del periodo en una sola fila, arriba de los graficos.
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Periodo"
            items={PERIODS.map((p) => ({ id: p, label: PERIOD_LABEL[p] }))}
            value={period}
            onChange={(p) => {
              setOffset(0);
              change((l) => ({ ...l, period: p }));
            }}
          />
          <div className="zs-glass inline-flex items-center gap-1 rounded-full p-[5px]">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(OFFSET_MIN, o - 1))}
              className="zs-press grid h-[38px] w-[38px] place-items-center rounded-full text-slate-600 transition-colors duration-200 hover:bg-white hover:text-slate-900"
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] px-1 text-center font-display text-sm font-semibold text-slate-900" aria-live="polite">
              {range.label}
            </span>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(OFFSET_MAX, o + 1))}
              className="zs-press grid h-[38px] w-[38px] place-items-center rounded-full text-slate-600 transition-colors duration-200 hover:bg-white hover:text-slate-900"
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {offset !== 0 ? (
            <button type="button" onClick={() => setOffset(0)} className={btnClass("quiet", "sm")}>
              Volver al actual
            </button>
          ) : null}
          {saveText ? (
            <span className={`ml-auto text-xs ${saveState === "error" ? "text-[#b91c1c]" : "text-slate-500"}`} role="status">
              {saveText}
            </span>
          ) : null}
        </div>
      )}

      {loadError ? <Notice tone="err">{loadError} Te mostramos el panel por defecto.</Notice> : null}
      {fetchError ? <Notice tone="err">{fetchError}</Notice> : null}
      {!layout ? <Loading label="Cargando tu panel…" /> : null}

      {layout && !layout.widgets.length && !editing ? (
        <Card>
          <EmptyState
            title="Tu panel está vacío"
            action={
              <button
                type="button"
                className={btnClass("primary", "sm", "mt-2")}
                onClick={() => {
                  setEditing(true);
                  setGallery(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Añadir widget
              </button>
            }
          >
            Elige las cifras que quieres seguir: citas, ingresos, pacientes, leads y más.
          </EmptyState>
        </Card>
      ) : null}

      {layout && (layout.widgets.length || editing) ? (
        <div className="zs-dash-wrap" onDragOver={onGridDragOver} onDrop={onGridDrop}>
          <div ref={gridRef} className="zs-dash-grid">
            {hole ? (
              <div
                aria-hidden="true"
                className="pointer-events-none rounded-2xl bg-slate-300/55 shadow-[inset_0_0_0_2px_rgba(80,201,213,.55)]"
                style={{ gridColumn: `${hole.x + 1} / span ${hole.w}`, gridRow: `${hole.y + 1} / span ${hole.h}` }}
              />
            ) : null}
            {slot && !hole ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute rounded-2xl bg-slate-300/45 shadow-[inset_0_0_0_1px_rgba(97,113,127,.18)] transition-[left,top,width,height] duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                style={{ left: slot.left, top: slot.top, width: slot.width, height: slot.height }}
              />
            ) : null}
            {layout.widgets.map((w, i) => {
              const e = effective(w);
              const isDragged = drag?.active && drag.id === w.id;
              const p = placements.get(w.id);
              const style = {
                "--i": Math.min(i, 10),
                ...(p ? { gridColumn: `${p.x + 1} / span ${p.w}`, gridRow: `${p.y + 1} / span ${p.h}` } : {}),
                ...(isDragged && dragOffset ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.03)`, zIndex: 30, position: "relative" as const } : {}),
              } as CSSProperties;
              return (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  data={dataFor(w)}
                  period={e.period}
                  span={resize?.id === w.id ? resize.span : { w: w.w, h: w.h }}
                  editing={editing}
                  dragging={Boolean(isDragged)}
                  resizing={resize?.id === w.id}
                  dragStyle={style}
                  jiggleDelay={`${(i % 5) * -0.07}s`}
                  gridRef={gridRef}
                  onConfigure={() => setConfigId(w.id)}
                  onUpdate={(patch) => change((l) => ({ ...l, widgets: l.widgets.map((x) => (x.id === w.id ? { ...x, ...patch } : x)) }))}
                  onRemove={() => removeWidget(w.id)}
                  onResizePreview={(span) => {
                    resizeRef.current = { id: w.id, span };
                    setResize(resizeRef.current);
                  }}
                  onResizeEnd={() => {
                    const r = resizeRef.current;
                    resizeRef.current = null;
                    setResize(null);
                    if (r && r.id === w.id && (r.span.w !== w.w || r.span.h !== w.h)) updateWidget(normalizeWidget({ ...w, ...r.span }));
                  }}
                  onDragPointerDown={onDragPointerDown(w.id)}
                />
              );
            })}
            {galleryDragging && dropIndex !== null && placements.get(PLACEHOLDER) ? <DropPlaceholder key={PLACEHOLDER} at={placements.get(PLACEHOLDER)!} /> : null}
            {editing && !galleryDragging ? (
              <button
                type="button"
                onClick={() => setGallery(true)}
                style={placements.get(ADD_TILE) ? { gridColumn: `${placements.get(ADD_TILE)!.x + 1} / span 1`, gridRow: `${placements.get(ADD_TILE)!.y + 1} / span 1` } : undefined}
                className="zs-w zs-press grid place-items-center rounded-[var(--radius-card)] border-2 border-dashed border-white bg-white/35 text-slate-600 backdrop-blur-md transition duration-200 hover:border-[#50c9d5] hover:bg-white/60 hover:text-[#17656c]"
              >
                <span className="flex flex-col items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white">
                    <Plus className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span className="font-display text-sm font-semibold">Añadir widget</span>
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {configWidget ? (
        <WidgetEditor
          widget={configWidget}
          data={dataFor(configWidget)}
          periodLabel={range.label}
          isFirst={configIndex === 0}
          isLast={configIndex === (layout?.widgets.length ?? 0) - 1}
          onChange={updateWidget}
          onMove={(dir) => moveWidget(configWidget.id, dir)}
          onDuplicate={() => duplicateWidget(configWidget.id)}
          onRemove={() => removeWidget(configWidget.id)}
          onClose={() => setConfigId(null)}
        />
      ) : null}

      {gallery ? (
        <WidgetGallery
          inUse={inUse}
          hidden={galleryDragging}
          onAdd={(drop) => insertWidget(drop)}
          onClose={() => setGallery(false)}
          onDragStart={(drop) => {
            setGalleryDragging(true);
            setDropSpan(drop.span);
          }}
          onDragEnd={() => {
            setGalleryDragging(false);
            setDropIndex(null);
          }}
        />
      ) : null}
    </View>
  );
}

/** Hueco donde caera el widget que se arrastra desde la galeria. */
function DropPlaceholder({ at }: { at: Placement }) {
  return (
    <div
      data-wid={PLACEHOLDER}
      aria-hidden="true"
      style={{ gridColumn: `${at.x + 1} / span ${at.w}`, gridRow: `${at.y + 1} / span ${at.h}` }}
      className="rounded-2xl bg-slate-300/45 shadow-[inset_0_0_0_1px_rgba(97,113,127,.18)]"
    />
  );
}
