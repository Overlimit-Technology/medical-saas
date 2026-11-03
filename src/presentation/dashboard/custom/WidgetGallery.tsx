"use client";

/**
 * Galeria para añadir widgets, en un panel que sube desde abajo (como la del iPhone):
 * categorias, buscador, vista previa de cada widget en sus tamaños y un toque para añadirlo.
 * En escritorio tambien se puede arrastrar una tarjeta directo a la grilla.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, Lock, Plus, Search, X } from "lucide-react";
import {
  CHART_LABEL,
  DEFAULT_SPAN,
  GRID,
  GROUPS,
  GROUP_LABEL,
  METRICS,
  PRESETS,
  UPCOMING,
  chartsFor,
  clampSpan,
  presetOf,
  spanFits,
  type ChartType,
  type MetricDef,
  type MetricGroup,
  type Span,
  type WidgetConfig,
} from "@/lib/dashboard/catalog";
import { btnClass, zs } from "@/presentation/ui/zs";
import { CHART_ICON } from "./chartIcons";
import { sampleResult } from "./samples";
import { WidgetBody } from "./WidgetCard";

export const DRAG_MIME = "application/x-zensya-widget";
export type NewWidgetDrop = { metric: string; chart: ChartType; span: Span };

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Medidas reales de cada tamaño en escritorio (columna 230px, fila 176px, separacion 16px). */
const COL = 230;
const ROW = 176;
const GAP = 16;
const realSize = (span: Span) => ({
  w: span.w * COL + (span.w - 1) * GAP,
  h: span.h * ROW + (span.h - 1) * GAP,
});

/** Un widget con datos de ejemplo, dibujado a su tamaño real y achicado para caber en `width` x `height`. */
function Preview({ def, chart, span, width, height = Infinity }: { def: MetricDef; chart: ChartType; span: Span; width: number; height?: number }) {
  const real = realSize(span);
  const scale = Math.min(1, width / real.w, height / real.h);
  const widget: WidgetConfig = { id: "preview", metric: def.id, chart, ...span, period: null, title: null, goal: null };
  return (
    <div style={{ width: real.w * scale, height: real.h * scale }} className="relative shrink-0" aria-hidden="true">
      <div
        className="zs-glass-inner pointer-events-none absolute left-0 top-0 flex flex-col rounded-[var(--radius-card)] p-5"
        style={{ width: real.w, height: real.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <h3 className="mb-3 truncate font-display text-[15.5px] font-bold tracking-[-0.2px] text-slate-900">{def.label}</h3>
        <div className="zs-w-body min-h-0 flex-1 overflow-hidden">
          <WidgetBody widget={widget} span={span} data={sampleResult(def)} period="month" />
        </div>
      </div>
    </div>
  );
}

/** Ancho de un elemento que puede aparecer despues (ref de callback: mide cuando se monta). */
function useWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    if (!el) return;
    setWidth(Math.floor(el.clientWidth));
    observer.current = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, width] as const;
}

export default function WidgetGallery({
  inUse,
  onAdd,
  onClose,
  onDragStart,
  onDragEnd,
  hidden,
}: {
  inUse: Set<string>;
  onAdd: (drop: NewWidgetDrop) => void;
  onClose: () => void;
  /** Al arrastrar una tarjeta, el panel se esconde para dejar ver la grilla. */
  onDragStart: (drop: NewWidgetDrop) => void;
  onDragEnd: () => void;
  hidden: boolean;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MetricGroup | "all">("all");
  const [picked, setPicked] = useState<MetricDef | null>(null);
  const [chart, setChart] = useState<ChartType>("kpi");
  const [span, setSpan] = useState<Span>({ w: 1, h: 1 });
  const [listRef, listWidth] = useWidth<HTMLDivElement>();
  const [detailRef, detailWidth] = useWidth<HTMLDivElement>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (picked ? setPicked(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picked]);

  const q = normalize(query.trim());
  const metrics = useMemo(
    () =>
      METRICS.filter(
        (m) => (group === "all" || m.group === group) && (!q || normalize(`${m.label} ${m.description} ${GROUP_LABEL[m.group]}`).includes(q))
      ),
    [group, q]
  );
  const upcoming = UPCOMING.filter((u) => (group === "all" || u.group === group) && (!q || normalize(`${u.label} ${u.needs}`).includes(q)));
  const groups = (group === "all" ? GROUPS : [group]).filter((g) => metrics.some((m) => m.group === g));

  const pick = (def: MetricDef) => {
    setPicked(def);
    setChart(def.defaultChart);
    setSpan(DEFAULT_SPAN[def.defaultChart]);
  };
  const changeChart = (c: ChartType) => {
    setChart(c);
    if (!spanFits(c, span)) setSpan(clampSpan(c, span));
  };

  const startDrag = (e: DragEvent, drop: NewWidgetDrop) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(drop));
    e.dataTransfer.setData("text/plain", drop.metric);
    // Deja que el navegador tome la imagen de arrastre antes de esconder el panel.
    setTimeout(() => onDragStart(drop), 0);
  };

  const tileWidth = Math.max(140, Math.min(260, (listWidth - 16) / Math.max(1, Math.floor(listWidth / 240))));

  return (
    <>
      <div
        className={cx("fixed inset-0 z-40 bg-[#0d1b2a]/30 backdrop-blur-[2px] transition-opacity duration-200", hidden ? "pointer-events-none opacity-0" : "zs-overlay-in")}
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-label="Añadir widget"
        className={cx(
          "zs-sheet zs-glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[86vh] w-full max-w-[1200px] flex-col rounded-t-[32px] !border-b-0 transition-transform duration-300",
          hidden && "pointer-events-none translate-y-full"
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />

        <header className="flex items-start gap-3 px-6 pb-3 pt-3 max-sm:px-4">
          {picked ? (
            <button type="button" onClick={() => setPicked(null)} className="zs-press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white" aria-label="Volver a la galería">
              <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <span className={zs.label}>{picked ? GROUP_LABEL[picked.group] : "Añadir widget"}</span>
            <h2 className="truncate font-display text-[24px] font-bold tracking-[-0.6px] text-slate-900">
              {picked ? (
                picked.label
              ) : (
                <>
                  ¿Qué quieres <span className="text-[#50c9d5]">ver</span>?
                </>
              )}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="zs-press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/80 bg-white/70 text-slate-600 transition hover:bg-white hover:text-slate-900" aria-label="Cerrar">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </header>

        {picked ? (
          // ---------------- Detalle: tamaños y grafico, con vista previa
          <div ref={detailRef} className="flex-1 overflow-y-auto px-6 pb-6 max-sm:px-4">
            <p className="mb-4 text-[14px] text-slate-600">{picked.description}</p>

            <SpanPicker chart={chart} span={span} onChange={setSpan} />

            <div
              className="mb-5 grid min-h-[200px] cursor-grab place-items-center rounded-[24px] border border-dashed border-white bg-white/40 p-5 active:cursor-grabbing"
              draggable
              onDragStart={(e) => startDrag(e, { metric: picked.id, chart, span })}
              onDragEnd={onDragEnd}
              title="Arrastra a tu panel o usa el botón Añadir"
            >
              <Preview def={picked} chart={chart} span={span} width={Math.max(160, detailWidth - 90)} height={300} />
            </div>

            {chartsFor(picked).length > 1 ? (
              <div className="mb-6">
                <span className={`${zs.label} mb-2 block`}>Tipo de gráfico</span>
                <div className="flex flex-wrap gap-2">
                  {chartsFor(picked).map((c) => {
                    const Icon = CHART_ICON[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => changeChart(c)}
                        className={cx(
                          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                          chart === c ? "border-[#50c9d5] bg-[#50c9d5]/15 text-[#17656c]" : "border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white"
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                        {CHART_LABEL[c]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-white/70 bg-white/80 px-6 py-4 backdrop-blur-xl max-sm:-mx-4 max-sm:px-4">
              <span className="text-[13px] text-slate-500 max-sm:hidden">
                {inUse.has(picked.id) ? "Ya tienes este widget; puedes añadir otro con otro tamaño o gráfico." : "Se añade al final de tu panel. Después lo puedes mover."}
              </span>
              <button type="button" className={btnClass("primary", "md", "ml-auto max-sm:w-full")} onClick={() => onAdd({ metric: picked.id, chart, span })}>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Añadir widget
              </button>
            </div>
          </div>
        ) : (
          // ---------------- Galeria por categorias
          <>
            <div className="flex flex-col gap-3 px-6 pb-3 max-sm:px-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" strokeWidth={1.8} />
                <input
                  autoFocus
                  className={cx(zs.input, "rounded-full pl-11")}
                  placeholder="Buscar: ingresos, inasistencias, leads…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {(["all", ...GROUPS] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    className={cx(
                      "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                      group === g ? "border-[#50c9d5] bg-[#50c9d5] text-[#080b04]" : "border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white"
                    )}
                  >
                    {g === "all" ? "Todo" : GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-6 pb-8 max-sm:px-4">
              {groups.map((g) => (
                <section key={g} className="mb-6" aria-label={GROUP_LABEL[g]}>
                  <h3 className={`${zs.label} mb-3`}>{GROUP_LABEL[g]}</h3>
                  <ul className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.floor(tileWidth)}px, 1fr))` }}>
                    {metrics
                      .filter((m) => m.group === g)
                      .map((m) => {
                        const def = m;
                        const s = DEFAULT_SPAN[def.defaultChart];
                        return (
                          <li key={def.id}>
                            <button
                              type="button"
                              draggable
                              onDragStart={(e) => startDrag(e, { metric: def.id, chart: def.defaultChart, span: s })}
                              onDragEnd={onDragEnd}
                              onClick={() => pick(def)}
                              className="zs-glass-inner zs-lift zs-press group flex h-full w-full flex-col gap-3 rounded-[22px] p-3 text-left hover:!border-[#50c9d5]"
                            >
                              <div className="grid h-[118px] place-items-center overflow-hidden rounded-2xl bg-[#f4f7f9]">
                                <Preview def={def} chart={def.defaultChart} span={s} width={Math.floor(tileWidth) - 36} height={104} />
                              </div>
                              <span className="min-w-0 px-1">
                                <b className="flex items-center gap-2 font-display text-[14.5px] font-semibold text-slate-900">
                                  <span className="truncate">{def.label}</span>
                                  {inUse.has(def.id) ? <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">En el panel</span> : null}
                                </b>
                                <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-slate-500">{def.description}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}

              {!metrics.length && !upcoming.length ? <p className="py-10 text-center text-sm text-slate-500">No encontramos widgets con “{query}”.</p> : null}

              {upcoming.length ? (
                <section className="mt-2" aria-label="Próximamente">
                  <h3 className={`${zs.label} mb-1`}>Próximamente</h3>
                  <p className="mb-3 text-xs leading-relaxed text-slate-500">Funciones que todavía no guardan datos. Aparecerán aquí cuando estén listas.</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {upcoming.map((u) => (
                      <li key={u.label} className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.8} />
                        <div className="min-w-0 flex-1">
                          <b className="block text-[13.5px] font-medium text-slate-600">{u.label}</b>
                          <span className="text-xs text-slate-500">Necesita: {u.needs}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{u.plan}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </>
        )}
      </section>
    </>
  );
}

/** Icono del tamaño: la forma del widget en una grilla de 4 x 2. */
export function SizeGlyph({ span, active }: { span: Span; active?: boolean }) {
  return (
    <svg viewBox="0 0 26 14" className="h-3.5 w-[26px]" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const on = col < span.w && row < Math.min(2, span.h);
        return (
          <rect
            key={i}
            x={col * 6.7}
            y={row * 7.2}
            width={5.6}
            height={6}
            rx={1.4}
            className={on ? (active ? "fill-[#080b04]" : "fill-[#17656c]") : active ? "fill-[#080b04]/20" : "fill-slate-300"}
          />
        );
      })}
    </svg>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/70 p-1">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label={`Menos ${label}`}>
        –
      </button>
      <span className="min-w-[88px] text-center text-[13px] font-semibold tabular-nums text-slate-900">
        {value} {label}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label={`Más ${label}`}>
        +
      </button>
    </div>
  );
}

/** Atajos con nombre y, debajo, columnas y filas para cualquier otro tamaño que quepa en la grilla. */
export function SpanPicker({ chart, span, onChange }: { chart: ChartType; span: Span; onChange: (span: Span) => void }) {
  const current = presetOf(span);
  const set = (next: Span) => onChange(clampSpan(chart, next));
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tamaño">
        {PRESETS.filter((p) => spanFits(chart, p)).map((p) => {
          const active = current?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ w: p.w, h: p.h })}
              className={cx(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                active ? "border-[#50c9d5] bg-[#50c9d5] text-[#080b04]" : "border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white"
              )}
            >
              <SizeGlyph span={p} active={active} />
              {p.label}
              <span className="text-xs opacity-70">
                {p.w}×{p.h}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
        <span>O a tu medida:</span>
        <Stepper label={span.w === 1 ? "columna" : "columnas"} value={span.w} min={1} max={GRID.cols} onChange={(w) => set({ ...span, w })} />
        <Stepper label={span.h === 1 ? "fila" : "filas"} value={span.h} min={1} max={GRID.maxRows} onChange={(h) => set({ ...span, h })} />
      </div>
    </div>
  );
}
