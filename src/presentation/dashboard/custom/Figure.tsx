"use client";

/**
 * Cifras (KPI) que reorganizan su contenido segun el tamaño del widget, como las tarjetas de las
 * referencias: numero grande, etiqueta, variacion con color y minigrafica.
 *
 * Segun las celdas que ocupa:
 * - 1 x 1: solo el valor (la etiqueta es el titulo del widget).
 * - Una fila, 2 o 3 columnas: valor, variacion y minigrafica a la derecha.
 * - Una fila, 4 columnas: valor y variacion, tendencia ancha y detalle en tres zonas.
 * - Dos filas o mas: valor y variacion, area de tendencia y detalle (periodo anterior, meta).
 */
import type { ChartType, MetricResult, SeriesPoint, Span, Unit } from "@/lib/dashboard/catalog";
import type { CSSProperties } from "react";
import { CountUp } from "@/presentation/ui/motion";
import { Delta, GoalBar } from "./charts";
import { formatCompact, formatValue, smoothPath } from "./format";

const ACCENT = "#1d9aa6";
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type Props = {
  chart: Extract<ChartType, "kpi" | "spark" | "ring">;
  span: Span;
  result: MetricResult;
  unit: Unit;
  higherIsBetter: boolean;
  goal: number | null;
  compareLabel: string;
};

const valueOf = (r: MetricResult) => (r.shape === "breakdown" || r.shape === "list" ? r.total : r.value);

/** El numero crece con el cuerpo del widget (container queries) y se compacta si no cabe. */
function Value({ value, unit, scale }: { value: number; unit: Unit; scale: "sm" | "md" | "lg" }) {
  const full = formatValue(value, unit);
  // En 1 x 1 una cifra de 10 caracteres ya no cabe: se compacta antes.
  const limit = scale === "sm" ? 9 : 10;
  const size = {
    sm: "text-[clamp(26px,min(19cqw,44cqh),46px)]",
    md: "text-[clamp(28px,min(11cqw,40cqh),46px)]",
    lg: "text-[clamp(32px,min(14cqw,22cqh),54px)]",
  }[scale];
  return (
    <b className={cx("block whitespace-nowrap font-display font-bold leading-[0.95] tracking-[-0.04em] text-slate-900 tabular-nums", size)} title={full}>
      <CountUp value={value} format={(n) => (full.length > limit ? formatCompact(n, unit) : formatValue(n, unit))} />
    </b>
  );
}

function Spark({ points, className, label }: { points: SeriesPoint[]; className?: string; label: string }) {
  const values = points.map((p) => p.value);
  if (values.length < 2) return <div className={className} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const coords = values.map((v, i) => [(i / (values.length - 1)) * 100, 37 - ((v - min) / (max - min || 1)) * 34]);
  const line = smoothPath(coords as Array<[number, number]>);
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg className={className} viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id="zs-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g className="zs-reveal">
        <path d={`${line} L100,40 L0,40 Z`} fill="url(#zs-spark-fill)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      <circle cx={lx} cy={ly} r={2.4} fill="#fff" stroke={ACCENT} strokeWidth={2} vectorEffect="non-scaling-stroke" className="zs-pop" />
    </svg>
  );
}

/** Mini columnas, como las de la tarjeta "Patients" de la referencia. */
function MiniBars({ points, className }: { points: SeriesPoint[]; className?: string }) {
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  return (
    <div className={cx("flex items-end gap-[3px]", className)} aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className="zs-grow-y w-full max-w-[10px] flex-1 rounded-full"
          style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: ACCENT, opacity: i === values.length - 1 ? 1 : 0.35 + (0.4 * i) / values.length, "--b": i } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Ring({ value, unit, diameter }: { value: number; unit: Unit; diameter: string }) {
  const share = Math.min(100, Math.max(0, value)) / 100;
  const r = 42;
  return (
    <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: diameter, height: diameter }} role="img" aria-label={formatValue(value, unit)}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={`${ACCENT}22`} strokeWidth="11" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={ACCENT}
        strokeWidth="11"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${share * 100} 100`}
        transform="rotate(-90 50 50)"
        className="zs-ring transition-[stroke-dasharray] duration-700"
      />
      <g className="zs-knob" style={{ transform: `rotate(${share * 360}deg)`, transformOrigin: "50% 50%", transformBox: "view-box" } as CSSProperties}>
        <circle cx={50} cy={50 - r} r={11 * 0.62} fill="#fff" stroke={ACCENT} strokeWidth={11 * 0.28} className="drop-shadow-[0_2px_4px_rgba(13,27,42,.25)]" />
      </g>
      <text x="50" y="50" dominantBaseline="central" textAnchor="middle" className="fill-slate-900 font-display font-bold" style={{ fontSize: 21 }}>
        <CountUp svg value={value} format={(n) => formatValue(n, unit).replace(" %", "%")} />
      </text>
    </svg>
  );
}

/** Como se reparte una cifra segun su tamaño en celdas. */
type Layout = "s" | "m" | "full" | "l";
const layoutOf = ({ w, h }: Span): Layout => (h === 1 ? (w === 1 ? "s" : w >= 4 ? "full" : "m") : "l");

export default function Figure({ chart, span, result, unit, higherIsBetter, goal, compareLabel }: Props) {
  const size = layoutOf(span);
  const value = valueOf(result);
  const series = result.shape === "trend" ? result.series : [];
  const previous = result.shape === "trend" ? result.previous : null;
  const trendLabel = `Tendencia: ${series.map((p) => `${p.label} ${formatValue(p.value, unit)}`).join(", ")}`;
  const delta =
    result.shape === "trend" ? (
      <Delta value={value} previous={result.previous} unit={unit} higherIsBetter={higherIsBetter} label={compareLabel} />
    ) : (
      <span className="text-xs text-slate-500">{result.shape === "snapshot" ? "Al día de hoy" : "Total del periodo"}</span>
    );
  const detail = (
    <div className="flex flex-col gap-1 text-[12.5px] text-slate-500">
      {previous !== null ? (
        <span>
          Periodo anterior: <b className="font-semibold text-slate-700 tabular-nums">{formatValue(previous, unit)}</b>
        </span>
      ) : null}
      {goal !== null ? <GoalBar value={value} goal={goal} unit={unit} higherIsBetter={higherIsBetter} /> : null}
    </div>
  );

  // ---- Anillo (porcentajes)
  if (chart === "ring") {
    if (size === "s") {
      return (
        <div className="grid h-full place-items-center">
          <Ring value={value} unit={unit} diameter="min(100cqh, 100cqw)" />
        </div>
      );
    }
    if (size === "m") {
      return (
        <div className="flex h-full items-center gap-4">
          <Ring value={value} unit={unit} diameter="min(100cqh, 42cqw)" />
          <div className="min-w-0 flex-1">{delta}</div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Ring value={value} unit={unit} diameter="min(62cqh, 70cqw)" />
        {delta}
        {goal !== null ? <div className="w-full">{detail}</div> : null}
      </div>
    );
  }

  const showSpark = chart === "spark" && series.length > 1;

  // ---- Pequeño: solo el valor
  if (size === "s") {
    return (
      <div className="flex h-full flex-col justify-end">
        <Value value={value} unit={unit} scale="sm" />
      </div>
    );
  }

  // ---- Mediano: valor y variacion a la izquierda, minigrafica a la derecha
  if (size === "m") {
    return (
      <div className="flex h-full items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Value value={value} unit={unit} scale="md" />
          {delta}
        </div>
        {showSpark ? (
          <Spark points={series} label={trendLabel} className="h-[70%] w-[42%] shrink-0" />
        ) : series.length > 1 ? (
          <MiniBars points={series} className="h-[62%] w-[34%] shrink-0" />
        ) : null}
      </div>
    );
  }

  // ---- Ancho completo: tres zonas
  if (size === "full") {
    return (
      <div className="grid h-full grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,1fr)] items-end gap-5 max-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Value value={value} unit={unit} scale="md" />
          {delta}
        </div>
        {series.length > 1 ? (
          showSpark ? <Spark points={series} label={trendLabel} className="h-full w-full" /> : <MiniBars points={series} className="h-[80%] w-full" />
        ) : (
          <div />
        )}
        <div className="max-[700px]:hidden">{detail}</div>
      </div>
    );
  }

  // ---- Grande: valor y variacion, tendencia y detalle
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <Value value={value} unit={unit} scale="lg" />
        {delta}
      </div>
      {series.length > 1 ? (
        showSpark ? (
          <Spark points={series} label={trendLabel} className="min-h-0 w-full flex-1" />
        ) : (
          <MiniBars points={series} className="min-h-0 w-full flex-1" />
        )
      ) : (
        <div className="flex-1" />
      )}
      {detail}
    </div>
  );
}
