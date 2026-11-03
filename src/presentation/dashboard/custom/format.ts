import type { MetricResult, Unit } from "@/lib/dashboard/catalog";

const nf = (max = 1) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: max });

/** Cifra completa para tarjetas y tablas ($1.234.567, 87,5 %, 12,5 h). */
export function formatValue(value: number, unit: Unit): string {
  switch (unit) {
    case "money":
      return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${nf().format(value)} %`;
    case "hours":
      return `${nf().format(value)} h`;
    case "minutes":
      return `${nf(0).format(value)} min`;
    default:
      return nf().format(value);
  }
}

/** Cifra corta para ejes y cifras grandes ($1,2 M, 12 mil). */
export function formatCompact(value: number, unit: Unit): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const short = (n: number, suffix: string) => `${sign}${unit === "money" ? "$" : ""}${nf(1).format(n)}${suffix}`;
  if (abs >= 1_000_000) return short(abs / 1_000_000, " M");
  if (abs >= 10_000) return short(abs / 1_000, " mil");
  if (unit === "money") return `${sign}$${nf(0).format(abs)}`;
  return formatValue(value, unit);
}

/** Variacion contra el periodo anterior. */
export function delta(value: number, previous: number | null, unit: Unit) {
  if (previous === null) return null;
  const diff = value - previous;
  if (unit === "percent") {
    return { diff, text: `${diff >= 0 ? "+" : "−"}${nf().format(Math.abs(diff))} pts` };
  }
  if (previous === 0) return { diff, text: value === 0 ? "Sin cambios" : "Nuevo" };
  const p = (diff / Math.abs(previous)) * 100;
  return { diff, text: `${p >= 0 ? "+" : "−"}${nf(Math.abs(p) < 10 ? 1 : 0).format(Math.abs(p))} %` };
}

/** Ticks redondos para el eje Y (0 y 3 o 4 pasos limpios). */
export function niceTicks(min: number, max: number, count = 4, integer = false): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0, 1];
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].map((s) => s * pow).find((s) => s >= raw) ?? raw;
  // Conteos y montos en pesos no tienen decimales: nunca un tick de 0,5 citas.
  const step = integer ? Math.max(1, Math.round(nice)) : nice;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step * 0.001; t += step) ticks.push(Number(t.toFixed(6)));
  if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Filas para la tabla y el CSV de cualquier resultado. */
export function toRows(result: MetricResult): Array<[string, number]> {
  switch (result.shape) {
    case "trend":
      return result.series.map((p) => [p.label, p.value]);
    case "breakdown":
      return result.items.map((i) => [i.label, i.value]);
    case "snapshot":
      return [["Ahora", result.value]];
    case "list":
      return result.rows.map((r) => [[r.meta, r.primary, r.secondary].filter(Boolean).join(" · "), 1]);
  }
}

export function downloadCsv(filename: string, header: [string, string], rows: Array<[string, number | string]>) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  // BOM para que Excel abra bien los acentos.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
