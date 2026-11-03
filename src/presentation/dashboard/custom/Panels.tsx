"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Copy, Download, Trash2, X } from "lucide-react";
import {
  CHART_LABEL,
  GROUPS,
  GROUP_LABEL,
  METRICS,
  METRIC_BY_ID,
  chartsFor,
  normalizeWidget,
  supportsGoal,
  type WidgetConfig,
} from "@/lib/dashboard/catalog";
import { PERIODS, PERIOD_LABEL, type PeriodKey } from "@/lib/dashboard/period";
import { btnClass, zs } from "@/presentation/ui/zs";
import { CHART_ICON } from "./chartIcons";
import { IconPicker, iconOf } from "./icons";
import { DESTINATIONS } from "./tools";
import { downloadCsv, toRows } from "./format";
import { SpanPicker } from "./WidgetGallery";
import type { WidgetData } from "./WidgetCard";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export { CHART_ICON };

function Drawer({ title, label, onClose, children, footer }: { title: ReactNode; label: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="zs-overlay-in fixed inset-0 z-40 bg-[#0d1b2a]/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-label={label} className="zs-glass-strong zs-drawer-in fixed bottom-3 right-3 top-3 z-50 flex w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px]">
        <div className="flex items-start justify-between gap-3 border-b border-white/70 px-6 py-5">
          <div className="min-w-0">{title}</div>
          <button type="button" onClick={onClose} className="zs-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900" aria-label="Cerrar">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-white/70 px-6 py-4">{footer}</div> : null}
      </aside>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-6">
      <span className={cx(zs.label, "mb-2 block")}>{label}</span>
      {children}
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor de un widget
// ---------------------------------------------------------------------------

export function WidgetEditor({
  widget,
  data,
  periodLabel,
  isFirst,
  isLast,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  onClose,
}: {
  widget: WidgetConfig;
  data: WidgetData;
  periodLabel: string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: WidgetConfig) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const def = METRIC_BY_ID.get(widget.metric);
  const charts = def ? chartsFor(def) : [];
  const [goalText, setGoalText] = useState(widget.goal === null ? "" : String(widget.goal));
  useEffect(() => setGoalText(widget.goal === null ? "" : String(widget.goal)), [widget.id, widget.goal]);

  const update = (patch: Partial<WidgetConfig>) => onChange(normalizeWidget({ ...widget, ...patch }));
  const isTool = def?.shape === "tool";
  const title = widget.title || def?.label || "Widget";

  const exportCsv = () => {
    if (!data || "error" in data) return;
    downloadCsv(`${title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-")}.csv`, [data.shape === "trend" ? "Tramo" : "Categoría", title], toRows(data));
  };

  return (
    <Drawer
      label={`Configurar ${title}`}
      onClose={onClose}
      title={
        <>
          <span className={zs.label}>Configurar widget</span>
          <h2 className="truncate font-display text-[22px] font-bold tracking-[-0.5px] text-slate-900">{title}</h2>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnClass("quiet", "sm")} onClick={onDuplicate}>
            <Copy className="h-4 w-4" strokeWidth={1.8} />
            Duplicar
          </button>
          {!isTool ? (
            <button type="button" className={btnClass("quiet", "sm")} onClick={exportCsv} disabled={!data || "error" in data}>
              <Download className="h-4 w-4" strokeWidth={1.8} />
              CSV
            </button>
          ) : null}
          <button type="button" className={btnClass("danger", "sm", "ml-auto")} onClick={onRemove}>
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            Quitar
          </button>
        </div>
      }
    >
      <Field label="Métrica" hint={def?.description}>
        <select className={zs.input} value={widget.metric} onChange={(e) => update({ metric: e.target.value, chart: METRIC_BY_ID.get(e.target.value)?.defaultChart ?? "kpi" })}>
          {GROUPS.map((g) => (
            <optgroup key={g} label={GROUP_LABEL[g]}>
              {METRICS.filter((mm) => mm.group === g).map((mm) => (
                <option key={mm.id} value={mm.id}>
                  {mm.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="Título">
        <input className={zs.input} value={widget.title ?? ""} placeholder={def?.label} maxLength={80} onChange={(e) => onChange({ ...widget, title: e.target.value || null })} />
      </Field>

      {widget.chart === "shortcut" ? (
        <Field label="Lleva a" hint="Al cambiar de sección se propone su icono, si no elegiste uno propio.">
          <select
            className={zs.input}
            value={widget.link?.href ?? DESTINATIONS[0].href}
            onChange={(e) => {
              const d = DESTINATIONS.find((x) => x.href === e.target.value) ?? DESTINATIONS[0];
              onChange({ ...widget, link: { href: d.href, label: d.label }, icon: widget.icon ?? { name: d.icon, color: "turquesa", size: "lg" } });
            }}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.href} value={d.href}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            className={cx(zs.input, "mt-2")}
            value={widget.link?.label ?? DESTINATIONS[0].label}
            maxLength={60}
            aria-label="Texto del acceso directo"
            onChange={(e) => onChange({ ...widget, link: { href: widget.link?.href ?? DESTINATIONS[0].href, label: e.target.value || DESTINATIONS[0].label } })}
          />
        </Field>
      ) : null}

      <Field label="Icono" hint="Opcional. Si no eliges uno, se usa el de la métrica.">
        <IconPicker value={widget.icon ?? null} fallback={iconOf({ metric: widget.metric, icon: null })} onChange={(icon) => onChange({ ...widget, icon })} />
      </Field>

      {!isTool ? (
      <Field label="Tipo de gráfico">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de gráfico">
          {charts.map((c) => {
            const Icon = CHART_ICON[c];
            const active = widget.chart === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ chart: c })}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors",
                  active ? "border-[#50c9d5] bg-[#50c9d5]/15 text-[#17656c]" : "border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                {CHART_LABEL[c]}
              </button>
            );
          })}
        </div>
      </Field>

      ) : null}

      <Field label="Tamaño" hint="Elige un atajo o cualquier tamaño que quepa en la grilla. En modo editar también puedes arrastrar los bordes del widget.">
        <SpanPicker chart={widget.chart} span={{ w: widget.w, h: widget.h }} onChange={(span) => update(span)} />
      </Field>

      {def?.shape === "snapshot" || def?.shape === "list" || isTool ? null : (
        <Field label="Periodo" hint={widget.period ? `Este widget siempre muestra el periodo actual.` : `Sigue el filtro del panel (${periodLabel}).`}>
          <select className={zs.input} value={widget.period ?? ""} onChange={(e) => update({ period: (e.target.value || null) as PeriodKey | null })}>
            <option value="">Usar el del panel</option>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]} actual
              </option>
            ))}
          </select>
        </Field>
      )}

      {def && supportsGoal(def) ? (
        <Field
          label={def.higherIsBetter === false ? "Meta (máximo aceptable)" : "Meta"}
          hint={
            def.higherIsBetter === false
              ? "Verde si la cifra queda bajo la meta, ámbar hasta un 20 % sobre ella y rojo más arriba."
              : "Verde al cumplirla, ámbar desde el 80 % y rojo más abajo."
          }
        >
          <div className="flex gap-2">
            <input
              className={zs.input}
              inputMode="decimal"
              placeholder={def.unit === "percent" ? "Por ejemplo, 90" : def.unit === "money" ? "Por ejemplo, 5000000" : "Por ejemplo, 120"}
              value={goalText}
              onChange={(e) => {
                setGoalText(e.target.value);
                const n = Number(e.target.value.replace(/\./g, "").replace(",", "."));
                onChange({ ...widget, goal: e.target.value.trim() === "" || !Number.isFinite(n) ? null : n });
              }}
            />
          </div>
        </Field>
      ) : null}

      <Field label="Posición">
        <div className="flex gap-2">
          <button type="button" className={btnClass("quiet", "sm")} disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Antes
          </button>
          <button type="button" className={btnClass("quiet", "sm")} disabled={isLast} onClick={() => onMove(1)}>
            Después
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </Field>
    </Drawer>
  );
}
