"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Minus, Settings2 } from "lucide-react";
import { GRID, METRIC_BY_ID, clampSpan, type MetricDef, spanFits, spanLabel, type MetricResult, type Span, type WidgetConfig } from "@/lib/dashboard/catalog";
import { PERIOD_LABEL, previousLabel, type PeriodKey } from "@/lib/dashboard/period";
import { colsForWidth } from "@/lib/dashboard/pack";
import { EmptyState } from "@/presentation/ui/zs";
import { DonutChart, HBarChart, ListChart, SeriesChart, TableChart } from "./charts";
import Figure from "./Figure";
import { IconBadge, iconOf } from "./icons";
import { FilesWidget, ShortcutWidget } from "./tools";
import { toRows } from "./format";

export type WidgetData = MetricResult | { error: string } | undefined;

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function WidgetBody({
  widget,
  span,
  data,
  period,
  onUpdate,
  interactive = false,
}: {
  widget: WidgetConfig;
  span: Span;
  data: WidgetData;
  period: PeriodKey;
  /** Herramientas que guardan contenido (archivos): cambian su propio widget. */
  onUpdate?: (patch: Partial<WidgetConfig>) => void;
  /** false en modo editar y en las vistas previas: los enlaces y botones internos no responden. */
  interactive?: boolean;
}) {
  const def = METRIC_BY_ID.get(widget.metric);
  if (!def) return <EmptyState title="Esta métrica ya no existe">Quita el widget o cambia su métrica.</EmptyState>;
  if (def.shape === "tool") {
    return widget.chart === "files" ? (
      <FilesWidget widget={widget} span={span} onUpdate={onUpdate} interactive={interactive} />
    ) : (
      <ShortcutWidget widget={widget} span={span} interactive={interactive} />
    );
  }
  if (data === undefined) {
    return (
      <div className="flex h-full flex-col justify-end gap-3" aria-busy="true">
        <span className="h-7 w-2/5 animate-pulse rounded-lg bg-slate-100" />
        <span className="h-3 w-3/5 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }
  if ("error" in data) return <p className="text-[13px] text-[#b91c1c]">{data.error}</p>;

  const higherIsBetter = def.higherIsBetter !== false;
  const chart = <ChartFor widget={widget} span={span} data={data} period={period} unit={def.unit} higherIsBetter={higherIsBetter} />;
  // Las cifras (KPI, tendencia, anillo) no se desmontan: cuentan del valor anterior al nuevo.
  return widget.chart === "kpi" || widget.chart === "spark" || widget.chart === "ring" ? chart : <Redraw data={data}>{chart}</Redraw>;
}

/** Firma corta de los datos: si cambia (otro periodo, otra metrica), el grafico se vuelve a dibujar. */
const signatureOf = (data: MetricResult) =>
  data.shape === "trend"
    ? `t${data.value}|${data.series.map((p) => p.value).join(",")}`
    : data.shape === "breakdown"
      ? `b${data.items.map((i) => i.value).join(",")}`
      : data.shape === "list"
        ? `l${data.rows.map((r) => r.id).join(",")}`
        : `s${"value" in data ? data.value : 0}`;

/**
 * Las cifras pasan del valor anterior al nuevo por si solas; los graficos se montan de nuevo con la
 * firma como key, asi barras, lineas y donas se dibujan otra vez. Despues de la primera vez van sin
 * esperar la entrada de la tarjeta (zs-refresh).
 */
function Redraw({ data, children }: { data: MetricResult; children: React.ReactNode }) {
  const sig = signatureOf(data);
  const first = useRef(sig);
  return (
    <div key={sig} className={cx("h-full", sig !== first.current && "zs-refresh")}>
      {children}
    </div>
  );
}

function ChartFor({ widget, span, data, period, unit, higherIsBetter }: { widget: WidgetConfig; span: Span; data: MetricResult; period: PeriodKey; unit: MetricDef["unit"]; higherIsBetter: boolean }) {
  const def = { unit, higherIsBetter };

  if (data.shape === "list") {
    return <ListChart rows={data.rows} empty={widget.metric === "agenda_today" ? "No hay citas para hoy" : "Nada pendiente"} />;
  }
  if (data.shape === "breakdown" && !data.items.length && widget.chart !== "kpi") {
    return <EmptyState title="Sin datos en este periodo">Prueba con un periodo más largo.</EmptyState>;
  }

  switch (widget.chart) {
    case "kpi":
    case "spark":
    case "ring":
      return (
        <Figure
          chart={widget.chart}
          span={span}
          result={data}
          unit={def.unit}
          higherIsBetter={higherIsBetter}
          goal={widget.goal}
          compareLabel={previousLabel(period)}
        />
      );
    case "line":
    case "area":
    case "bar":
      return (
        <SeriesChart type={widget.chart} unit={def.unit} points={data.shape === "trend" ? data.series : data.shape === "breakdown" ? data.items : []} />
      );
    case "hbar":
      return data.shape === "breakdown" ? <HBarChart items={data.items} unit={def.unit} /> : null;
    case "donut":
      return data.shape === "breakdown" ? <DonutChart items={data.items} total={data.total} unit={def.unit} /> : null;
    case "table":
      return <TableChart rows={toRows(data)} unit={def.unit} header={data.shape === "trend" ? "Tramo" : "Categoría"} />;
    default:
      return null;
  }
}

/** Bordes y esquinas que cambian el tamaño: x e y dicen hacia donde crece el widget al arrastrar. */
const HANDLES: Array<{ id: string; x: -1 | 0 | 1; y: -1 | 0 | 1; className: string; cursor: string }> = [
  { id: "nw", x: -1, y: -1, className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-nwse-resize" },
  { id: "ne", x: 1, y: -1, className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "cursor-nesw-resize" },
  { id: "sw", x: -1, y: 1, className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-nesw-resize" },
  { id: "se", x: 1, y: 1, className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", cursor: "cursor-nwse-resize" },
  { id: "n", x: 0, y: -1, className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ns-resize" },
  { id: "s", x: 0, y: 1, className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "cursor-ns-resize" },
  { id: "w", x: -1, y: 0, className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { id: "e", x: 1, y: 0, className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

export default function WidgetCard({
  widget,
  data,
  period,
  span,
  editing,
  dragging,
  dragStyle,
  jiggleDelay,
  gridRef,
  onConfigure,
  onRemove,
  onResizePreview,
  onResizeEnd,
  onDragPointerDown,
  onUpdate,
}: {
  widget: WidgetConfig;
  data: WidgetData;
  /** Periodo efectivo del widget (el propio o el del panel). */
  period: PeriodKey;
  /** Celdas a dibujar: las guardadas o la vista previa mientras se arrastra una esquina. */
  span: Span;
  editing: boolean;
  dragging: boolean;
  /** El panel lo sabe; la tarjeta dibuja su propio fantasma mientras se redimensiona. */
  resizing?: boolean;
  dragStyle?: CSSProperties;
  jiggleDelay: string;
  gridRef: React.RefObject<HTMLDivElement>;
  onConfigure: () => void;
  onRemove: () => void;
  onResizePreview: (span: Span) => void;
  onResizeEnd: () => void;
  onDragPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onUpdate?: (patch: Partial<WidgetConfig>) => void;
}) {
  const def = METRIC_BY_ID.get(widget.metric);
  const start = useRef<{
    x: number;
    y: number;
    rect: { left: number; top: number; width: number; height: number };
    colPx: number;
    rowPx: number;
    gap: number;
    gridCols: number;
    maxW: number;
    dx: number;
    dy: number;
  } | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  /** El widget mientras se arrastra una esquina: sigue al puntero en pantalla. */
  const [ghost, setGhost] = useState<{ left: number; top: number; width: number; height: number; settling: boolean } | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const title = widget.title || def?.label || "Widget";
  const timeless = def?.shape === "snapshot" || def?.shape === "list";
  const subtitle = timeless ? (widget.metric === "agenda_today" ? "Hoy" : "Ahora") : widget.period ? `${PERIOD_LABEL[widget.period]} actual` : null;

  // ---- Redimensionar desde bordes y esquinas. El widget sigue al puntero sin saltos; en la grilla
  // queda el fondo gris del tamaño admitido mas cercano, que es donde cae al soltar.
  const onHandleDown = (e: ReactPointerEvent<HTMLElement>, dx: number, dy: number) => {
    const grid = gridRef.current;
    const article = articleRef.current;
    if (!grid || !article) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    clearTimeout(settleTimer.current);
    const cs = getComputedStyle(grid);
    const gridCols = colsForWidth(grid.clientWidth);
    const gap = parseFloat(cs.columnGap) || 16;
    const colPx = (grid.clientWidth - gap * (gridCols - 1)) / gridCols + gap;
    const rowPx = (parseFloat(cs.gridAutoRows) || 176) + (parseFloat(cs.rowGap) || gap);
    const r = article.getBoundingClientRect();
    const rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    start.current = { x: e.clientX, y: e.clientY, rect, colPx, rowPx, gap, gridCols, maxW: grid.clientWidth, dx, dy };
    setGhost({ ...rect, settling: false });
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const minW = Math.min(s.colPx - s.gap, 140);
    const minH = Math.min(s.rowPx - s.gap, 120);
    const width = Math.min(s.maxW, Math.max(minW, s.rect.width + s.dx * (e.clientX - s.x)));
    const maxH = GRID.maxRows * s.rowPx - s.gap;
    const height = Math.min(maxH, Math.max(minH, s.rect.height + s.dy * (e.clientY - s.y)));
    // Los bordes izquierdo y superior mueven el origen: el lado opuesto queda quieto.
    const left = s.dx < 0 ? s.rect.left + (s.rect.width - width) : s.rect.left;
    const top = s.dy < 0 ? s.rect.top + (s.rect.height - height) : s.rect.top;
    setGhost({ left, top, width, height, settling: false });
    // Se engancha a la celda mas cercana: cualquier ancho y alto entero que quepa en la grilla.
    let cols = Math.round((width + s.gap) / s.colPx);
    const rows = Math.round((height + s.gap) / s.rowPx);
    // En la grilla de 2 columnas, llenar la fila no achica un widget que en escritorio es mas ancho.
    if (s.gridCols < GRID.cols && cols >= s.gridCols) cols = Math.max(widget.w, s.gridCols);
    const next = clampSpan(widget.chart, { w: Math.min(cols, GRID.cols), h: Math.min(rows, GRID.maxRows) });
    if (spanFits(widget.chart, next) && (next.w !== span.w || next.h !== span.h)) onResizePreview(next);
  };
  const onHandleUp = () => {
    if (!start.current) return;
    start.current = null;
    // El widget se desliza hasta el fondo gris y recien ahi queda en la grilla.
    const target = articleRef.current?.getBoundingClientRect();
    if (target && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGhost({ left: target.left, top: target.top, width: target.width, height: target.height, settling: true });
      settleTimer.current = setTimeout(() => {
        setGhost(null);
        onResizeEnd();
      }, 260);
    } else {
      setGhost(null);
      onResizeEnd();
    }
  };

  // La cara del widget: se dibuja en su lugar o, mientras se redimensiona, en el fantasma.
  const face = (floating: boolean) => (
    <div
      className={cx(
        "zs-glass relative flex h-full min-w-0 flex-col rounded-[var(--radius-card)] p-5 transition-[box-shadow,border-color,background-color,transform] duration-200 [transition-timing-function:cubic-bezier(.22,1,.36,1)] max-sm:p-4",
        editing ? "!border-[#50c9d5]/70" : !floating && "hover:-translate-y-0.5 hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--glass-shadow-hover)]",
        editing && !dragging && !floating && "zs-jiggle",
        dragging && "shadow-[0_24px_60px_rgba(13,27,42,.22)] ring-2 ring-[#50c9d5]",
        floating && "shadow-[0_24px_60px_rgba(13,27,42,.20)] ring-2 ring-[#50c9d5]"
      )}
      style={editing && !floating ? { animationDelay: jiggleDelay } : undefined}
    >
        {/* El acceso directo muestra su icono y nombre en grande: la cabecera solo lleva el boton de ajustes. */}
        <header className={cx("flex items-start gap-2.5", widget.chart === "shortcut" ? "absolute right-4 top-4 z-[1]" : "mb-3")}>
            {widget.chart !== "shortcut" ? (
              <>
                <IconBadge icon={iconOf(widget)} className="group-hover:-rotate-6 group-hover:scale-105" />
                <div className="min-w-0 flex-1 self-center" title={title}>
                  <h2 className="truncate font-display text-[15.5px] font-bold leading-snug tracking-[-0.2px] text-slate-900">{title}</h2>
                  {subtitle && !(span.w === 1 && span.h === 1) ? <span className="block truncate text-xs text-slate-500">{subtitle}</span> : null}
                </div>
              </>
            ) : null}
            {editing ? (
              <button
                type="button"
                onClick={onConfigure}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#50c9d5]/10 text-[#17656c] transition hover:bg-[#50c9d5]/25"
                aria-label={`Ajustar ${title}`}
              >
                <Settings2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            ) : def?.href ? (
              <Link
                href={def.href}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-[#50c9d5] hover:text-[#17656c]"
                aria-label={`Ir a ${title}`}
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onConfigure}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 opacity-0 transition hover:bg-slate-100 hover:text-[#17656c] focus:opacity-100 group-hover:opacity-100"
                aria-label={`Ajustar ${title}`}
              >
                <Settings2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )}
          </header>
  
          <div className="zs-w-body min-h-0 flex-1 overflow-hidden">
            <WidgetBody widget={widget} span={span} data={data} period={period} onUpdate={onUpdate} interactive={!editing} />
          </div>
  
    </div>
  );

  return (
    <article
      ref={articleRef}
      data-wid={widget.id}
      data-w={span.w}
      data-h={span.h}
      id={`widget-${widget.id}`}
      aria-label={title}
      className={cx(
        "zs-w zs-in group relative min-w-0",
        editing && "touch-none select-none",
        dragging ? "z-30 cursor-grabbing" : editing && "cursor-grab"
      )}
      style={dragStyle}
      onPointerDown={editing ? onDragPointerDown : undefined}
    >
      {ghost ? (
        // Fondo gris: el lugar y el tamaño donde va a quedar el widget.
        <div className="h-full rounded-[var(--radius-card)] bg-white/30 shadow-[inset_0_0_0_2px_rgba(255,255,255,.9)] backdrop-blur-sm transition-all duration-300" aria-hidden="true" />
      ) : (
        face(false)
      )}

      {editing ? (
        <>
          {/* Quitar, como el "–" de los widgets del iPhone. */}
          <button
            type="button"
            onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
            className={cx("absolute -left-2.5 -top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-slate-700 text-white shadow-md ring-2 ring-white transition hover:bg-[#b91c1c]", ghost && "opacity-0")}
            aria-label={`Quitar ${title}`}
          >
            <Minus className="h-4 w-4" strokeWidth={3} />
          </button>
          {!dragging
            ? HANDLES.map((h) => (
                <span
                  key={h.id}
                  role="presentation"
                  data-handle
                  title="Arrastra para cambiar el tamaño"
                  className={cx(
                    "absolute z-10 grid touch-none place-items-center",
                    h.className,
                    h.cursor,
                    h.x !== 0 && h.y !== 0 ? "h-6 w-6" : h.x === 0 ? "h-5 w-12" : "h-12 w-5",
                    h.id === "nw" && "hidden", // esa esquina la ocupa el boton de quitar
                    ghost && "opacity-0"
                  )}
                  onPointerDown={(e) => onHandleDown(e, h.x, h.y)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                >
                  <span
                    className={cx(
                      "block rounded-full border-2 border-white bg-[#50c9d5] shadow-sm",
                      h.x !== 0 && h.y !== 0 ? "h-3.5 w-3.5" : h.x === 0 ? "h-1.5 w-7" : "h-7 w-1.5"
                    )}
                  />
                </span>
              ))
            : null}
        </>
      ) : null}
      {ghost && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cx("pointer-events-none fixed z-[60]", ghost.settling && "transition-[left,top,width,height] duration-[260ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]")}
              style={{ left: ghost.left, top: ghost.top, width: ghost.width, height: ghost.height }}
              aria-hidden="true"
            >
              {face(true)}
              {!ghost.settling ? (
                <span className="absolute inset-x-0 -bottom-4 mx-auto w-max rounded-full bg-[#0d1b2a] px-3 py-1 text-xs font-medium text-white shadow-md">
                  {spanLabel(span)}
                </span>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </article>
  );
}
