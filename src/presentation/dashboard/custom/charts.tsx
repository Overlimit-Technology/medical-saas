"use client";

/**
 * Graficos del panel personalizable, en SVG y sin librerias. Siguen la guia de visualizacion:
 * barras de 24px como maximo con la punta redondeada, lineas de 2px, rellenos al 10%, grilla de
 * 1px, valores en tinta de texto (nunca del color de la serie) y tooltip al pasar el mouse.
 * Todos ocupan el alto y el ancho que les da el widget.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleX, Minus, TriangleAlert } from "lucide-react";
import type { BreakdownItem, ListRow, MetricResult, SeriesPoint, Unit } from "@/lib/dashboard/catalog";
import { EmptyState, StatusPill } from "@/presentation/ui/zs";
import { CountUp } from "@/presentation/ui/motion";
import { gsap, reduced } from "@/presentation/ui/fx";

/**
 * Valores que se transforman: al llegar datos nuevos con la misma cantidad de tramos, cada punto va
 * de su valor anterior al nuevo (como la referencia Solvik) en vez de redibujar todo desde cero.
 */
function useMorph(target: number[], duration: number) {
  const [shown, setShown] = useState(target);
  const cur = useRef(target);
  const key = target.join(",");
  useEffect(() => {
    const from = cur.current;
    if (from.length !== target.length || reduced()) {
      cur.current = target;
      setShown(target);
      return;
    }
    const s = { t: 0 };
    const tween = gsap.to(s, {
      t: 1,
      duration,
      ease: "power3.inOut",
      onUpdate: () => {
        const v = target.map((x, i) => from[i] + (x - from[i]) * s.t);
        cur.current = v;
        setShown(v);
      },
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, duration]);
  return shown;
}
import { delta, formatCompact, formatValue, niceTicks, smoothPath } from "./format";

/**
 * Orden fijo de colores para categorias: los mismos de --chart-1..8 en globals.css. Solo la paleta
 * de Zensya: turquesa, marino, turquesa claro y oscuro, y el ambar y rojo de los estados.
 */
export const PALETTE = ["#1d9aa6", "#0d1b2a", "#50c9d5", "#1e737b", "#e8a020", "#84d9e1", "#e5484d", "#8c9aa8"];
const ACCENT = PALETTE[0];
// Lineas de guia: variables de globals.css (oscuras en tema claro, claras en el tema Liquido).
// Van en style: los atributos de SVG no aceptan var().
const GRID_LINE = "var(--chart-grid)";
const BASELINE = "var(--chart-base)";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function Tooltip({ x, children, width }: { x: number; children: ReactNode; width: number }) {
  // Se queda dentro del grafico aunque el punto este en un borde.
  const left = Math.min(Math.max(x, 70), Math.max(70, width - 70));
  return (
    <div
      className="zs-glass-strong zs-menu-in pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2 text-xs"
      style={{ left }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cifras
// ---------------------------------------------------------------------------

type GoalTone = "ok" | "warn" | "err";

function goalState(value: number, goal: number, higherIsBetter: boolean): { tone: GoalTone; progress: number } {
  if (higherIsBetter) {
    const ratio = goal ? value / goal : 1;
    return { tone: ratio >= 1 ? "ok" : ratio >= 0.8 ? "warn" : "err", progress: Math.min(1, Math.max(0, ratio)) };
  }
  const ratio = value ? goal / value : 1;
  return { tone: value <= goal ? "ok" : value <= goal * 1.2 ? "warn" : "err", progress: Math.min(1, Math.max(0, ratio)) };
}

const GOAL_UI: Record<GoalTone, { label: string; color: string; icon: typeof CircleCheck; text: string }> = {
  ok: { label: "En meta", color: ACCENT, icon: CircleCheck, text: "text-[#17656c]" },
  warn: { label: "Cerca de la meta", color: "#e8a020", icon: TriangleAlert, text: "text-[#8a5a0b]" },
  err: { label: "Lejos de la meta", color: "#e5484d", icon: CircleX, text: "text-[#b91c1c]" },
};

export function GoalBar({ value, goal, unit, higherIsBetter }: { value: number; goal: number; unit: Unit; higherIsBetter: boolean }) {
  const { tone, progress } = goalState(value, goal, higherIsBetter);
  const ui = GOAL_UI[tone];
  const Icon = ui.icon;
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className={cx("inline-flex items-center gap-1 font-medium", ui.text)}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {ui.label}
        </span>
        <span className="text-slate-500">
          Meta {higherIsBetter ? "" : "máx. "}
          {formatValue(goal, unit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: `${ui.color}26` }}>
        <div className="zs-grow-x h-full rounded-full transition-[width] duration-500" style={{ width: `${progress * 100}%`, background: ui.color }} />
      </div>
    </div>
  );
}

export function Delta({ value, previous, unit, higherIsBetter, label }: { value: number; previous: number | null; unit: Unit; higherIsBetter: boolean; label: string }) {
  const d = delta(value, previous, unit);
  if (!d) return <span className="text-xs text-slate-500">Sin comparación</span>;
  const good = d.diff === 0 ? null : d.diff > 0 === higherIsBetter;
  const Icon = d.diff === 0 ? Minus : d.diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span
        className={cx(
          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold",
          good === null ? "bg-slate-100 text-slate-600" : good ? "bg-[#50c9d5]/15 text-[#17656c]" : "bg-[#e5484d]/10 text-[#b91c1c]"
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        {d.text}
      </span>
      <span className="text-slate-500">{label}</span>
    </span>
  );
}

function BigNumber({ value, unit, size }: { value: number; unit: Unit; size: "md" | "lg" }) {
  const full = formatValue(value, unit);
  return (
    <b
      className={cx("block font-display font-bold leading-none text-slate-900", size === "lg" ? "text-[40px] tracking-[-1.5px]" : "text-[30px] tracking-[-1px]")}
      title={full}
    >
      <CountUp value={value} format={(n) => (full.length > 11 ? formatCompact(n, unit) : formatValue(n, unit))} />
    </b>
  );
}

type FigureProps = {
  result: MetricResult;
  unit: Unit;
  higherIsBetter: boolean;
  goal: number | null;
  compareLabel: string;
};

const figureValue = (r: MetricResult) => (r.shape === "breakdown" || r.shape === "list" ? r.total : r.value);

export function KpiChart({ result, unit, higherIsBetter, goal, compareLabel }: FigureProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const value = figureValue(result);
  return (
    <div ref={ref} className="flex h-full flex-col justify-end">
      <BigNumber value={value} unit={unit} size={size.h > 130 ? "lg" : "md"} />
      <div className="mt-2.5">
        {result.shape === "trend" ? (
          <Delta value={value} previous={result.previous} unit={unit} higherIsBetter={higherIsBetter} label={compareLabel} />
        ) : (
          <span className="text-xs text-slate-500">{result.shape === "snapshot" ? "Al día de hoy" : "Total del periodo"}</span>
        )}
      </div>
      {goal !== null ? <GoalBar value={value} goal={goal} unit={unit} higherIsBetter={higherIsBetter} /> : null}
    </div>
  );
}

export function SparkChart(props: FigureProps & { points: SeriesPoint[] }) {
  const { points, result, unit, higherIsBetter, compareLabel, goal } = props;
  const value = figureValue(result);
  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const coords = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * 100, 30 - ((v - min) / (max - min || 1)) * 28 - 1]);
  const line = smoothPath(coords as Array<[number, number]>);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
        <BigNumber value={value} unit={unit} size="md" />
        {result.shape === "trend" ? (
          <Delta value={value} previous={result.previous} unit={unit} higherIsBetter={higherIsBetter} label={compareLabel} />
        ) : null}
      </div>
      {goal !== null ? <GoalBar value={value} goal={goal} unit={unit} higherIsBetter={higherIsBetter} /> : null}
      <svg
        className="mt-2 min-h-[18px] w-full flex-1"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Tendencia: ${points.map((p) => `${p.label} ${formatValue(p.value, unit)}`).join(", ")}`}
      >
        {coords.length > 1 ? (
          <g className="zs-reveal">
            <path d={`${line} L100,30 L0,30 Z`} fill={ACCENT} fillOpacity={0.1} />
            <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export function RingChart({ result, unit, higherIsBetter, goal, compareLabel }: FigureProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const value = figureValue(result);
  // En un widget angosto el anillo va arriba y la comparacion abajo.
  const stacked = size.w < 300;
  const d = Math.max(64, stacked ? Math.min(size.h - 52, size.w, 150) : Math.min(size.h - 8, size.w * 0.5, 170));
  const stroke = Math.max(10, d * 0.11);
  const r = (d - stroke) / 2;
  const share = Math.min(100, Math.max(0, value)) / 100;
  const color = goal !== null ? GOAL_UI[goalState(value, goal, higherIsBetter).tone].color : ACCENT;
  return (
    <div ref={ref} className={cx("flex h-full gap-x-5 gap-y-3", stacked ? "flex-col justify-center" : "items-center")}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="shrink-0" role="img" aria-label={formatValue(value, unit)}>
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke={`${color}26`} strokeWidth={stroke} />
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${share * 100} 100`}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
          className="zs-ring transition-[stroke-dasharray] duration-700"
        />
      <g className="zs-knob" style={{ transform: `rotate(${share * 360}deg)`, transformOrigin: "50% 50%", transformBox: "view-box" } as CSSProperties}>
        <circle cx={d / 2} cy={d / 2 - r} r={stroke * 0.62} fill="#fff" stroke={ACCENT} strokeWidth={stroke * 0.28} className="drop-shadow-[0_2px_4px_rgba(13,27,42,.25)]" />
      </g>
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-slate-900 font-display font-bold" style={{ fontSize: d * 0.2 }}>
          <CountUp svg value={value} format={(n) => formatValue(n, unit).replace(" %", "%")} />
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        {result.shape === "trend" ? (
          <Delta value={value} previous={result.previous} unit={unit} higherIsBetter={higherIsBetter} label={compareLabel} />
        ) : null}
        {goal !== null ? <GoalBar value={value} goal={goal} unit={unit} higherIsBetter={higherIsBetter} /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evolucion y columnas
// ---------------------------------------------------------------------------

export function SeriesChart({ points, previous, unit, type }: { points: SeriesPoint[]; previous?: SeriesPoint[]; unit: Unit; type: "line" | "area" | "bar" }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map((p) => p.value);
  const shownValues = useMorph(values, type === "bar" ? 0.7 : 0.9);
  const shownPrev = useMorph(previous?.map((p) => p.value) ?? [], 0.9);
  // El periodo anterior solo va en lineas y areas, como una linea punteada debajo de la actual.
  const prev = type !== "bar" && previous?.length === points.length && previous.some((p) => p.value) ? previous : null;
  const all = prev ? [...values, ...prev.map((p) => p.value)] : values;
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all), 4, unit === "count" || unit === "money");
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const tickLabels = ticks.map((t) => formatCompact(t, unit));
  const padL = Math.max(...tickLabels.map((t) => t.length)) * 6.4 + 10;
  const padB = 22;
  const padT = 10;
  const plotW = Math.max(0, size.w - padL - 4);
  const plotH = Math.max(0, size.h - padB - padT);
  const n = points.length || 1;
  const band = plotW / n;
  const y = (v: number) => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const xc = (i: number) => padL + band * i + band / 2;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 44))));
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const showCaps = type === "bar" && band >= 30 && n <= 12;
  const zeroY = y(0);

  const linePath = smoothPath(points.map((p, i) => [xc(i), y(shownValues[i] ?? p.value)]));
  const prevPath = prev ? smoothPath(prev.map((p, i) => [xc(i), y(shownPrev[i] ?? p.value)])) : null;
  // Barras en el turquesa de las lineas y areas, con un degradado suave hacia la base.
  const gid = useId().replace(/:/g, "");

  return (
    <div ref={ref} className="relative h-full min-h-[120px] w-full" onMouseLeave={() => setHover(null)}>
      {size.w > 0 ? (
        <svg width={size.w} height={size.h} role="img" aria-label={points.map((p) => `${p.label}: ${formatValue(p.value, unit)}`).join(", ")}>
          <defs>
            <linearGradient id={`bar${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#50c9d5" />
              <stop offset="100%" stopColor={ACCENT} />
            </linearGradient>
            <linearGradient id={`area${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.24} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={padL} x2={size.w - 4} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? BASELINE : GRID_LINE }} strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dominantBaseline="central" textAnchor="end" className="fill-slate-500 tabular-nums" style={{ fontSize: 11 }}>
                {tickLabels[i]}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === 0 ? (
              <text key={`x${i}`} x={xc(i)} y={size.h - 6} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
                {p.label}
              </text>
            ) : null
          )}

          {type === "bar"
            ? points.map((p, i) => {
                const v = shownValues[i] ?? p.value;
                const top = y(Math.max(0, v));
                const bottom = y(Math.min(0, v));
                const h = Math.max(p.value === 0 ? 0 : 1, bottom - top);
                const r = Math.min(6, barW / 2, h);
                const x0 = xc(i) - barW / 2;
                // Punta redondeada, base recta sobre la linea del cero.
                const d =
                  p.value >= 0
                    ? `M${x0},${zeroY} V${zeroY - h + r} Q${x0},${zeroY - h} ${x0 + r},${zeroY - h} H${x0 + barW - r} Q${x0 + barW},${zeroY - h} ${x0 + barW},${zeroY - h + r} V${zeroY} Z`
                    : `M${x0},${zeroY} V${zeroY + h - r} Q${x0},${zeroY + h} ${x0 + r},${zeroY + h} H${x0 + barW - r} Q${x0 + barW},${zeroY + h} ${x0 + barW},${zeroY + h - r} V${zeroY} Z`;
                return (
                  <g key={`b${i}`}>
                    <path
                      d={d}
                      fill={`url(#bar${gid})`}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      className={cx("zs-grow-y transition-[opacity,filter] duration-200", hover === i && "brightness-110", p.value < 0 && "zs-neg")}
                      style={{ "--b": i } as CSSProperties}
                    />
                    {showCaps && p.value !== 0 ? (
                      <text x={xc(i)} y={p.value >= 0 ? zeroY - h - 5 : zeroY + h + 12} textAnchor="middle" className="zs-pop fill-slate-900 font-semibold" style={{ fontSize: 11, "--d": `${900 + i * 70}ms` } as CSSProperties}>
                        {formatCompact(p.value, unit)}
                      </text>
                    ) : null}
                  </g>
                );
              })
            : null}

          {type !== "bar" && points.length ? (
            <>
              {/* Relleno: aparece cuando la linea ya va dibujada. */}
              {type === "area" ? (
                <path d={`${linePath} L${xc(n - 1)},${zeroY} L${xc(0)},${zeroY} Z`} fill={`url(#area${gid})`} className="zs-area-in" />
              ) : null}
              {/* Periodo anterior: punteada y tenue. */}
              {prevPath ? (
                <path d={prevPath} fill="none" strokeWidth={1.5} strokeDasharray="4 5" strokeLinecap="round" className="zs-reveal" style={{ stroke: "rgb(var(--slate-400))" }} />
              ) : null}
              {/* La linea se dibuja de izquierda a derecha. */}
              <path d={linePath} pathLength={1} fill="none" stroke={ACCENT} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" className="zs-draw" />
              {hover !== null ? (
                <>
                  <line x1={xc(hover)} x2={xc(hover)} y1={padT} y2={padT + plotH} style={{ stroke: BASELINE }} strokeWidth={1} strokeDasharray="3 4" />
                  {prev ? <circle cx={xc(hover)} cy={y(prev[hover].value)} r={3.5} fill="#fff" strokeWidth={1.5} style={{ stroke: "rgb(var(--slate-400))" }} /> : null}
                  <circle cx={xc(hover)} cy={y(points[hover].value)} r={9} fill={ACCENT} opacity={0.18} />
                  <circle cx={xc(hover)} cy={y(points[hover].value)} r={5} fill={ACCENT} stroke="#fff" strokeWidth={2} />
                </>
              ) : (
                <circle cx={xc(n - 1)} cy={y(points[n - 1].value)} r={4.5} fill={ACCENT} stroke="#fff" strokeWidth={2} className="zs-pop" />
              )}
            </>
          ) : null}

          {/* Zonas de hover mas grandes que la marca. */}
          {points.map((p, i) => (
            <rect key={`h${i}`} x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      ) : null}
      {hover !== null && points[hover] ? (
        <Tooltip x={xc(hover)} width={size.w}>
          <b className="block font-semibold tabular-nums text-slate-900">{formatValue(points[hover].value, unit)}</b>
          <span className="block text-slate-500">{points[hover].label}</span>
          {prev ? <span className="mt-0.5 block text-slate-500">Periodo anterior: {formatValue(prev[hover].value, unit)}</span> : null}
        </Tooltip>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reparto
// ---------------------------------------------------------------------------

const colorOf = (item: BreakdownItem, i: number) => item.color ?? PALETTE[i % PALETTE.length];

export function HBarChart({ items, unit }: { items: BreakdownItem[]; unit: Unit }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {items.map((item, i) => (
        <li key={item.label} className="group" title={`${item.label}: ${formatValue(item.value, unit)}`}>
          <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-slate-900">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatValue(item.value, unit)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/70 shadow-[inset_0_1px_2px_rgba(15,23,42,.08)]">
            <div
              className="zs-grow-x h-full rounded-full transition-[width] duration-500 group-hover:brightness-95"
              style={{ width: `${Math.max(1.5, (Math.abs(item.value) / max) * 100)}%`, background: item.color ?? ACCENT, "--b": i } as CSSProperties}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Reparto en una sola barra: cada categoria es un tramo de la barra (se llenan en orden) y abajo la
 * lista con su porcentaje y valor. Al pasar el puntero, el tramo y su fila se destacan juntos.
 */
export function StackChart({ items, total, unit }: { items: BreakdownItem[]; total: number; unit: Unit }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = items.filter((i) => i.value > 0);
  const pctOf = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4" onMouseLeave={() => setHover(null)}>
      <div className="flex h-3.5 shrink-0 gap-[3px]" role="img" aria-label={shown.map((i) => `${i.label} ${pctOf(i.value)} %`).join(", ")}>
        {shown.map((item, i) => (
          <span
            key={item.label}
            onMouseEnter={() => setHover(i)}
            className={cx("zs-grow-x h-full rounded-full transition-[opacity,transform] duration-200", hover !== null && hover !== i && "opacity-40", hover === i && "scale-y-[1.35]")}
            style={{ flexGrow: item.value, flexBasis: 0, minWidth: 6, background: colorOf(item, items.indexOf(item)), "--b": i } as CSSProperties}
          />
        ))}
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 text-[13px]">
        {items.map((item, i) => (
          <li
            key={item.label}
            onMouseEnter={() => setHover(shown.indexOf(item))}
            className={cx("zs-in flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-slate-900 transition-colors duration-200", hover !== null && shown[hover] === item && "bg-slate-100")}
            style={{ "--i": Math.min(i, 8) } as CSSProperties}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(item, i) }} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">{pctOf(item.value)} %</span>
            <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatValue(item.value, unit)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DonutChart({ items, total, unit }: { items: BreakdownItem[]; total: number; unit: Unit }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const wide = size.w > size.h * 1.25;
  const d = Math.max(96, Math.min(wide ? size.h - 4 : size.h * 0.55, wide ? size.w * 0.45 : size.w, 200));
  const stroke = Math.max(12, d * 0.13);
  const r = (d - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = items.filter((i) => i.value > 0).length > 1 ? 2 : 0;
  let acc = 0;
  const active = hover !== null ? items[hover] : null;

  return (
    <div ref={ref} className={cx("flex h-full min-h-0 gap-5", wide ? "items-center" : "flex-col items-center")}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="shrink-0" role="img" aria-label={items.map((i) => `${i.label} ${formatValue(i.value, unit)}`).join(", ")}>
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" style={{ stroke: GRID_LINE }} strokeWidth={stroke} />
        {items.map((item, i) => {
          const len = total ? (item.value / total) * c : 0;
          const offset = -acc;
          acc += len;
          if (len <= 0) return null;
          return (
            <circle
              key={item.label}
              cx={d / 2}
              cy={d / 2}
              r={r}
              fill="none"
              stroke={colorOf(item, i)}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              pathLength={100}
              strokeDasharray={`${(Math.max(0.5, len - gap) / c) * 100} ${100 - (Math.max(0.5, len - gap) / c) * 100}`}
              strokeDashoffset={(offset / c) * 100}
              transform={`rotate(-90 ${d / 2} ${d / 2})`}
              opacity={hover === null || hover === i ? 1 : 0.4}
              className="zs-ring cursor-default transition-[opacity,stroke-width]"
              style={{ "--b": i } as CSSProperties}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
        <text x="50%" y="47%" dominantBaseline="central" textAnchor="middle" className="fill-slate-900 font-display font-bold" style={{ fontSize: Math.max(16, d * 0.15) }}>
          {active ? formatCompact(active.value, unit) : <CountUp svg value={total} format={(n) => formatCompact(n, unit)} />}
        </text>
        <text x="50%" y="62%" dominantBaseline="central" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
          {active ? `${total ? Math.round((active.value / total) * 100) : 0} %` : "total"}
        </text>
      </svg>
      <ul className={cx("min-w-0 space-y-1.5 overflow-y-auto text-[13px]", wide ? "max-h-full flex-1" : "w-full flex-1")}>
        {items.map((item, i) => (
          <li
            key={item.label}
            className={cx("flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-slate-900 transition-colors duration-200", hover === i && "bg-white/80")}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(item, i) }} />
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="ml-auto shrink-0 pl-2 font-semibold tabular-nums">{formatValue(item.value, unit)}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">{total ? Math.round((item.value / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla y lista
// ---------------------------------------------------------------------------

export function TableChart({ rows, unit, header }: { rows: Array<[string, number]>; unit: Unit; header: string }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white/80 backdrop-blur-md">
          <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <th className="pb-2 font-semibold">{header}</th>
            <th className="pb-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={`${label}${i}`} className="zs-in border-t border-white/80 transition-colors duration-200 hover:bg-white/60" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
              <td className="py-2 pr-3 text-slate-900">{label}</td>
              <td className="py-2 text-right font-medium tabular-nums text-slate-900">{formatValue(value, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListChart({ rows, empty }: { rows: ListRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ul className="flex h-full flex-col overflow-y-auto pr-1">
      {rows.map((row, i) => (
        <li key={row.id} style={{ "--i": Math.min(i, 8) } as CSSProperties} className="zs-in flex items-center gap-4 border-t border-white/80 py-2.5 first:border-t-0 first:pt-0">
          {row.meta ? <span className="w-[76px] shrink-0 font-display text-[14px] font-bold tabular-nums text-[#17656c]">{row.meta}</span> : null}
          <div className="min-w-0 flex-1">
            <b className="block truncate font-display text-[14.5px] font-semibold text-slate-900">{row.primary}</b>
            {row.secondary ? <span className="block truncate text-[13px] text-slate-500">{row.secondary}</span> : null}
          </div>
          {row.status ? <StatusPill tone={row.status.tone}>{row.status.label}</StatusPill> : null}
        </li>
      ))}
    </ul>
  );
}
