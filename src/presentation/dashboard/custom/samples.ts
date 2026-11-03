/**
 * Datos de ejemplo para las vistas previas de la galeria de widgets. No son datos de la clinica:
 * solo muestran como se ve cada widget en cada tamaño antes de añadirlo.
 */
import type { MetricDef, MetricResult } from "@/lib/dashboard/catalog";

const BASE: Record<MetricDef["unit"], number> = { count: 128, money: 2_450_000, percent: 86, hours: 64, minutes: 7 };
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const CATEGORIES = ["Kinesiología", "Medicina general", "Nutrición", "Psicología", "Dermatología"];

export function sampleResult(def: MetricDef): MetricResult {
  const base = BASE[def.unit];
  switch (def.shape) {
    case "trend": {
      const wave = [0.62, 0.71, 0.66, 0.8, 0.74, 0.92, 1];
      return {
        shape: "trend",
        value: base,
        previous: Math.round(base * (def.higherIsBetter === false ? 1.12 : 0.88)),
        series: wave.map((k, i) => ({ label: DAYS[i], value: Math.round((base / 7) * k * (def.unit === "percent" ? 7 : 1)) })),
      };
    }
    case "snapshot":
      return { shape: "snapshot", value: base };
    case "breakdown": {
      const shares = [0.38, 0.26, 0.18, 0.11, 0.07];
      const items = shares.map((k, i) => ({ label: CATEGORIES[i], value: Math.round(base * k) }));
      return { shape: "breakdown", total: items.reduce((a, b) => a + b.value, 0), items };
    }
    case "list":
      return {
        shape: "list",
        total: 3,
        rows: [
          { id: "1", primary: "Camila Fernández", secondary: "Kinesiología · Box 2", meta: "09:00", status: { label: "Confirmada", tone: "ok" } },
          { id: "2", primary: "Matías López", secondary: "Medicina general · Box 1", meta: "10:30", status: { label: "Por confirmar", tone: "warn" } },
          { id: "3", primary: "Ana García", secondary: "Nutrición · Box 3", meta: "12:00", status: { label: "Confirmada", tone: "ok" } },
        ],
      };
    case "tool":
      // Las herramientas no tienen datos: muestran su propio contenido.
      return { shape: "snapshot", value: 0 };
  }
}
