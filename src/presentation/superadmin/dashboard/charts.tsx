"use client";

// Graficas SVG propias (sin librerias): linea, barras agrupadas y donut.
// Todas tienen tooltip al pasar el mouse y leyenda clicable (oculta/muestra una serie).
import { useMemo, useRef, useState } from "react";

export type ChartSeries = { key: string; label: string; color: string; format?: (v: number) => string };
export type ChartPoint = { label: string; tooltipLabel?: string; values: Record<string, number | null> };

const W = 640;
const H = 240;
const PAD = { l: 52, r: 14, t: 14, b: 28 };

// Eje con paso "redondo" (1, 2, 2.5, 5 x 10^n) y 3 a 6 marcas.
function niceScale(max: number) {
  if (max <= 0) return { max: 1, ticks: 4 };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((v) => v >= raw) ?? 10 * mag;
  const ticks = Math.max(1, Math.ceil(max / step - 1e-9));
  return { max: step * ticks, ticks };
}

const compact = (v: number) =>
  new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(v);

function Legend({
  series,
  hidden,
  onToggle,
}: {
  series: ChartSeries[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {series.map((s) => {
        const off = hidden.has(s.key);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            aria-pressed={!off}
            title={off ? "Mostrar serie" : "Ocultar serie"}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition hover:bg-slate-100 ${
              off ? "text-slate-400 line-through" : "text-slate-600"
            }`}
          >
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: off ? "#cbd5e1" : s.color }} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function useHidden() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { hidden, toggle };
}

function Tooltip({
  point,
  series,
  hidden,
  leftPct,
}: {
  point: ChartPoint;
  series: ChartSeries[];
  hidden: Set<string>;
  leftPct: number;
}) {
  const flip = leftPct > 60;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={flip ? { right: `${100 - leftPct + 2}%` } : { left: `${leftPct + 2}%` }}
    >
      <p className="mb-1 font-semibold text-slate-800">{point.tooltipLabel ?? point.label}</p>
      {series
        .filter((s) => !hidden.has(s.key))
        .map((s) => {
          const v = point.values[s.key];
          return (
            <p key={s.key} className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {v === null || v === undefined ? "-" : (s.format ?? String)(v)}
              </span>
            </p>
          );
        })}
    </div>
  );
}

function Axes({ max, ticks = 4, format }: { max: number; ticks?: number; format?: (v: number) => string }) {
  return (
    <>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max * i) / ticks;
        const y = H - PAD.b - ((H - PAD.t - PAD.b) * i) / ticks;
        return (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={i === 0 ? undefined : "3 3"} />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {format ? format(v) : compact(v)}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function LineChart({
  points,
  series,
  ariaLabel,
  yFormat,
}: {
  points: ChartPoint[];
  series: ChartSeries[];
  ariaLabel: string;
  yFormat?: (v: number) => string;
}) {
  const { hidden, toggle } = useHidden();
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const visible = series.filter((s) => !hidden.has(s.key));
  const { max, ticks } = niceScale(Math.max(0, ...points.flatMap((p) => visible.map((s) => p.values[s.key] ?? 0))));
  const n = points.length;
  const x = (i: number) => PAD.l + (n <= 1 ? (W - PAD.l - PAD.r) / 2 : ((W - PAD.l - PAD.r) * i) / (n - 1));
  const y = (v: number) => H - PAD.b - ((H - PAD.t - PAD.b) * v) / max;

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - rel) < Math.abs(x(best) - rel)) best = i;
    setHover(best);
  };

  return (
    <div>
      <Legend series={series} hidden={hidden} onToggle={toggle} />
      <div ref={ref} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="w-full">
          <Axes max={max} ticks={ticks} format={yFormat} />
          {visible.map((s) => {
            const segs: string[] = [];
            let pen = false;
            points.forEach((p, i) => {
              const v = p.values[s.key];
              if (v === null || v === undefined) {
                pen = false;
                return;
              }
              segs.push(`${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
              pen = true;
            });
            return (
              <g key={s.key}>
                <path d={segs.join(" ")} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, i) => {
                  const v = p.values[s.key];
                  if (v === null || v === undefined) return null;
                  return <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth={2} />;
                })}
              </g>
            );
          })}
          {points.map((p, i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={hover === i ? "#0f172a" : "#64748b"}>
              {p.label}
            </text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b8" strokeDasharray="3 3" />}
        </svg>
        {hover !== null && points[hover] && (
          <Tooltip point={points[hover]} series={series} hidden={hidden} leftPct={(x(hover) / W) * 100} />
        )}
      </div>
    </div>
  );
}

export function BarChart({
  points,
  series,
  ariaLabel,
  yFormat,
}: {
  points: ChartPoint[];
  series: ChartSeries[];
  ariaLabel: string;
  yFormat?: (v: number) => string;
}) {
  const { hidden, toggle } = useHidden();
  const [hover, setHover] = useState<number | null>(null);

  const visible = series.filter((s) => !hidden.has(s.key));
  const { max, ticks } = niceScale(Math.max(0, ...points.flatMap((p) => visible.map((s) => p.values[s.key] ?? 0))));
  const n = Math.max(1, points.length);
  const slot = (W - PAD.l - PAD.r) / n;
  const groupW = Math.min(slot * 0.8, 22 * Math.max(1, visible.length));
  const barW = visible.length ? groupW / visible.length : 0;
  const base = H - PAD.b;
  const h = (v: number) => ((H - PAD.t - PAD.b) * v) / max;

  return (
    <div>
      <Legend series={series} hidden={hidden} onToggle={toggle} />
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="w-full">
          <Axes max={max} ticks={ticks} format={yFormat} />
          {points.map((p, i) => {
            const cx = PAD.l + i * slot + slot / 2;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill={hover === i ? "#f1f5f9" : "transparent"} />
                {visible.map((s, j) => {
                  const v = p.values[s.key] ?? 0;
                  return (
                    <rect
                      key={s.key}
                      x={cx - groupW / 2 + j * barW + 1}
                      y={base - h(v)}
                      width={Math.max(2, barW - 2)}
                      height={h(v)}
                      rx={3}
                      fill={s.color}
                    />
                  );
                })}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={hover === i ? "#0f172a" : "#64748b"}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && points[hover] && (
          <Tooltip point={points[hover]} series={series} hidden={hidden} leftPct={((PAD.l + hover * slot + slot / 2) / W) * 100} />
        )}
      </div>
    </div>
  );
}

export type DonutSlice = { key: string; label: string; value: number; color: string; sub?: string };

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function DonutChart({
  slices,
  centerLabel,
  ariaLabel,
  valueFormat = (v) => String(v),
  onSelect,
  selectedKey,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  ariaLabel: string;
  valueFormat?: (v: number) => string;
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);

  const shown = useMemo(() => slices.filter((s) => !hidden.has(s.key) && s.value > 0), [slices, hidden]);
  const total = shown.reduce((s, x) => s + x.value, 0);
  const cx = 90;
  const cy = 90;
  const r = 66;

  let angle = -Math.PI / 2;
  const arcs = shown.map((s) => {
    const sweep = total > 0 ? (s.value / total) * Math.PI * 2 : 0;
    const a0 = angle;
    // Una sola porcion completa no se puede dibujar con un arco (inicio = fin).
    const a1 = shown.length === 1 ? angle + Math.PI * 2 - 0.001 : angle + sweep;
    angle += sweep;
    return { s, d: arc(cx, cy, r, a0, a1) };
  });
  const active = hover ? slices.find((s) => s.key === hover) : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 180 180" role="img" aria-label={ariaLabel} className="h-44 w-44 shrink-0">
        {total === 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={22} />}
        {arcs.map(({ s, d }) => (
          <path
            key={s.key}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === s.key || selectedKey === s.key ? 28 : 22}
            opacity={hover && hover !== s.key ? 0.45 : 1}
            className={onSelect ? "cursor-pointer" : ""}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(s.key)}
          >
            <title>{`${s.label}: ${valueFormat(s.value)}`}</title>
          </path>
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
          {active ? valueFormat(active.value) : valueFormat(total)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="#64748b">
          {active ? active.label : centerLabel}
        </text>
      </svg>
      <ul className="w-full space-y-1 text-sm">
        {slices.map((s) => {
          const off = hidden.has(s.key);
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={!off}
                title={off ? "Mostrar" : "Ocultar"}
                onClick={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.key)) next.delete(s.key);
                    else next.add(s.key);
                    return next;
                  })
                }
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left transition hover:bg-slate-100 ${
                  off ? "text-slate-400 line-through" : "text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: off ? "#cbd5e1" : s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums text-slate-900">
                  <b>{valueFormat(s.value)}</b>
                  {s.sub && <span className="ml-2 text-xs text-slate-500">{s.sub}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
