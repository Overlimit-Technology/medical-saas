"use client";

/**
 * Iconos personalizables del panel: el admin elige icono, color y tamaño para cada widget o acceso
 * directo. Sin eleccion se usa el icono por defecto de la metrica. Los iconos son de Lucide, una
 * seleccion curada por categoria (iconLibrary.ts). Los colores son solo de la paleta de Zensya.
 */
import { useDeferredValue, useMemo, useState } from "react";
import { Circle, Search } from "lucide-react";
import { ICON_COLORS, METRIC_BY_ID, type IconColor, type IconSize, type MetricGroup, type WidgetConfig, type WidgetIcon } from "@/lib/dashboard/catalog";
import { zs } from "@/presentation/ui/zs";
import { ICON_LIBRARY } from "./iconLibrary";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** Fondo y trazo de cada color (texto/icono con contraste sobre su fondo). */
export const ICON_TONE: Record<IconColor, { label: string; box: string; swatch: string }> = {
  turquesa: { label: "Turquesa", box: "bg-[#50c9d5] text-[#080b04]", swatch: "#50c9d5" },
  oscuro: { label: "Turquesa oscuro", box: "bg-[#1e737b] text-white", swatch: "#1e737b" },
  marino: { label: "Azul marino", box: "bg-[#0d1b2a] text-white", swatch: "#0d1b2a" },
  aqua: { label: "Aqua", box: "bg-[#84d9e1] text-[#0d1b2a]", swatch: "#84d9e1" },
  ambar: { label: "Ámbar", box: "bg-[#e8a020] text-[#0d1b2a]", swatch: "#e8a020" },
  rojo: { label: "Rojo", box: "bg-[#e5484d] text-white", swatch: "#e5484d" },
  gris: { label: "Gris", box: "bg-[#e8edf1] text-[#4a5c6d]", swatch: "#c3ced6" },
};

export const ICON_PX: Record<IconSize, { box: number; icon: number; label: string }> = {
  sm: { box: 28, icon: 14, label: "Chico" },
  md: { box: 34, icon: 17, label: "Mediano" },
  lg: { box: 44, icon: 22, label: "Grande" },
};

const GROUP_ICON: Record<MetricGroup, { name: string; color: IconColor }> = {
  agenda: { name: "calendar-days", color: "turquesa" },
  pacientes: { name: "users", color: "oscuro" },
  finanzas: { name: "wallet", color: "marino" },
  tratamientos: { name: "syringe", color: "aqua" },
  clinico: { name: "stethoscope", color: "oscuro" },
  crm: { name: "messages-square", color: "turquesa" },
  equipo: { name: "briefcase-medical", color: "marino" },
  herramientas: { name: "layout-grid", color: "aqua" },
};

/** Algunas metricas tienen un icono mas preciso que el de su grupo. */
const METRIC_ICON: Record<string, string> = {
  attendance_rate: "user-check",
  no_show_rate: "user-x",
  cancellation_rate: "calendar-x",
  confirmation_rate: "calendar-check",
  online_bookings: "globe",
  arrivals: "door-open",
  hours_by_box: "door-open",
  appointments_by_hour: "clock",
  new_patients: "user-plus",
  revenue: "banknote",
  agenda_today: "calendar-clock",
  files: "folder-open",
  shortcut: "mouse-pointer-click",
};

/** El icono que se ve: el elegido o el de la metrica. */
export function iconOf(widget: Pick<WidgetConfig, "metric" | "icon">): WidgetIcon {
  if (widget.icon) return widget.icon;
  const def = METRIC_BY_ID.get(widget.metric);
  const base = def ? GROUP_ICON[def.group] : GROUP_ICON.herramientas;
  return { name: METRIC_ICON[widget.metric] ?? base.name, color: base.color, size: "md" };
}

/** Icono en su cuadro de color. Un nombre que ya no existe cae en un icono generico. */
export function IconBadge({ icon, size, className }: { icon: WidgetIcon; size?: IconSize; className?: string }) {
  const px = ICON_PX[size ?? icon.size];
  const Glyph = ICON_LIBRARY[icon.name] ?? Circle;
  return (
    <span
      className={cx("grid shrink-0 place-items-center rounded-[30%] shadow-[inset_0_1px_0_rgba(255,255,255,.35)] transition-transform duration-300", ICON_TONE[icon.color].box, className)}
      style={{ width: px.box, height: px.box }}
      aria-hidden="true"
    >
      <Glyph size={px.icon} strokeWidth={1.9} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Biblioteca curada (con palabras en español para buscar)
// ---------------------------------------------------------------------------

const LIBRARY: Array<{ id: string; label: string; icons: Array<[string, string]> }> = [
  {
    id: "agenda",
    label: "Agenda",
    icons: [
      ["calendar", "calendario"], ["calendar-days", "calendario dias agenda"], ["calendar-check", "cita confirmada"], ["calendar-clock", "hora cita"],
      ["calendar-plus", "nueva cita"], ["calendar-x", "cancelada"], ["clock", "reloj hora"], ["clock-3", "hora"], ["alarm-clock", "alarma recordatorio"],
      ["timer", "tiempo espera"], ["hourglass", "espera"], ["history", "historial"],
    ],
  },
  {
    id: "personas",
    label: "Personas",
    icons: [
      ["user", "paciente persona"], ["users", "pacientes equipo"], ["user-check", "asistio"], ["user-x", "inasistencia"], ["user-plus", "nuevo paciente"],
      ["user-round", "persona"], ["users-round", "grupo"], ["contact", "contacto ficha"], ["baby", "pediatria bebe"], ["person-standing", "persona"],
      ["accessibility", "accesibilidad"], ["id-card", "credencial rut"],
    ],
  },
  {
    id: "salud",
    label: "Salud",
    icons: [
      ["heart-pulse", "pulso salud"], ["stethoscope", "medico consulta"], ["syringe", "inyeccion tratamiento"], ["pill", "medicamento"], ["pill-bottle", "farmacia"],
      ["activity", "actividad signos"], ["thermometer", "temperatura"], ["microscope", "laboratorio"], ["dna", "genetica"], ["hospital", "hospital clinica"],
      ["ambulance", "urgencia"], ["bandage", "curacion"], ["bone", "hueso trauma"], ["brain", "neurologia psicologia"], ["eye", "ojo oftalmologia"],
      ["ear", "oido"], ["hand-heart", "cuidado"], ["heart", "corazon"], ["cross", "cruz salud"], ["scan-heart", "cardiologia"], ["smile", "sonrisa dental"],
      ["sparkles", "estetica"], ["flask-conical", "laboratorio examen"], ["test-tube", "examen muestra"],
    ],
  },
  {
    id: "clinico",
    label: "Clínico",
    icons: [
      ["clipboard-list", "ficha lista"], ["clipboard-check", "evaluacion"], ["clipboard-plus", "nueva ficha"], ["file-heart", "historia clinica"],
      ["notebook-pen", "notas evolucion"], ["list-checks", "checklist"], ["list-todo", "pendientes"], ["badge-check", "verificado"], ["shield-check", "seguro"],
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icons: [
      ["wallet", "caja billetera"], ["banknote", "dinero ingreso"], ["credit-card", "tarjeta pago"], ["receipt", "boleta recibo"], ["piggy-bank", "ahorro"],
      ["coins", "monedas"], ["hand-coins", "cobro"], ["landmark", "banco"], ["calculator", "calculo"], ["percent", "porcentaje descuento"],
      ["trending-up", "sube crece"], ["trending-down", "baja"],
    ],
  },
  {
    id: "graficos",
    label: "Gráficos",
    icons: [
      ["chart-line", "grafico linea"], ["chart-column", "columnas"], ["chart-bar", "barras"], ["chart-pie", "torta dona"], ["chart-area", "area"],
      ["target", "meta objetivo"], ["trophy", "logro"], ["award", "premio"], ["gauge", "indicador"],
    ],
  },
  {
    id: "comunicacion",
    label: "Comunicación",
    icons: [
      ["message-circle", "mensaje chat whatsapp"], ["messages-square", "mensajes"], ["mail", "correo"], ["phone", "telefono llamada"], ["send", "enviar"],
      ["bell", "aviso notificacion"], ["bell-ring", "alerta"], ["megaphone", "campaña marketing"], ["inbox", "bandeja"], ["at-sign", "email"], ["video", "videollamada"],
    ],
  },
  {
    id: "clinica",
    label: "Clínica",
    icons: [
      ["building", "edificio"], ["building-2", "sede"], ["house", "inicio casa"], ["door-open", "box sala llegada"], ["bed", "camilla"], ["armchair", "sala espera"],
      ["briefcase", "trabajo"], ["briefcase-medical", "equipo medico"], ["store", "tienda"], ["package", "insumo"], ["boxes", "inventario"], ["printer", "imprimir"],
    ],
  },
  {
    id: "archivos",
    label: "Archivos",
    icons: [
      ["folder", "carpeta"], ["folder-open", "carpeta abierta"], ["folder-up", "subir"], ["file", "archivo"], ["file-text", "documento pdf"],
      ["file-spreadsheet", "excel planilla"], ["file-image", "imagen"], ["file-archive", "zip"], ["files", "archivos"], ["image", "foto"], ["camera", "camara"],
      ["upload", "subir"], ["download", "descargar"], ["paperclip", "adjunto"], ["link", "enlace"], ["external-link", "abrir"],
    ],
  },
  {
    id: "general",
    label: "General",
    icons: [
      ["layout-grid", "panel"], ["layout-dashboard", "dashboard"], ["kanban", "crm tablero"], ["settings", "configuracion"], ["sliders-horizontal", "ajustes"],
      ["wrench", "herramienta"], ["lock", "candado"], ["key", "clave"], ["search", "buscar"], ["star", "favorito"], ["bookmark", "guardado"], ["flag", "bandera"],
      ["tag", "etiqueta"], ["gift", "regalo"], ["zap", "rapido"], ["rocket", "lanzamiento"], ["lightbulb", "idea"], ["compass", "explorar"], ["map-pin", "ubicacion"],
      ["map", "mapa"], ["globe", "web online"], ["circle-check", "listo"], ["circle-alert", "alerta"], ["triangle-alert", "advertencia"], ["info", "informacion"],
      ["check-check", "completado"], ["mouse-pointer-click", "acceso clic"], ["arrow-up-right", "ir"], ["leaf", "natural"], ["sun", "dia"], ["moon", "noche"],
      ["coffee", "pausa"], ["apple", "nutricion"], ["dumbbell", "kinesiologia ejercicio"], ["car", "auto"], ["truck", "despacho"], ["plane", "viaje"],
    ],
  },
];

const ALL_CURATED = LIBRARY.flatMap((c) => c.icons);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Selector de icono: biblioteca curada por categoria y busqueda en toda la coleccion de Lucide.
 * value null = icono por defecto.
 */
export function IconPicker({ value, fallback, onChange }: { value: WidgetIcon | null; fallback: WidgetIcon; onChange: (icon: WidgetIcon | null) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(LIBRARY[0].id);
  const deferred = useDeferredValue(query);
  const current = value ?? fallback;

  const results = useMemo(() => {
    const q = norm(deferred.trim());
    if (!q) return LIBRARY.find((c) => c.id === category)?.icons.map(([n]) => n) ?? [];
    // Por palabra en español o por el nombre del icono en ingles.
    return ALL_CURATED.filter(([n, words]) => norm(`${n} ${words}`).includes(q)).map(([n]) => n);
  }, [deferred, category]);

  const set = (patch: Partial<WidgetIcon>) => onChange({ ...current, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={current} size="lg" />
        <div className="min-w-0 flex-1 text-[13px] text-slate-600">
          {value ? <>Icono personalizado: <b className="font-semibold text-slate-900">{value.name}</b></> : "Icono por defecto de la métrica"}
        </div>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="zs-press rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white">
            Usar el de siempre
          </button>
        ) : null}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" strokeWidth={1.8} />
        <input className={cx(zs.input, "rounded-full pl-11")} placeholder="Buscar: calendario, pago, corazón…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar icono" />
      </label>

      {!query ? (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorías de iconos">
          {LIBRARY.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cx(
                "zs-press rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === c.id ? "border-[#50c9d5] bg-[#50c9d5] text-[#080b04]" : "border-white/80 bg-white/70 text-slate-600 hover:border-[#50c9d5] hover:bg-white"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid max-h-[232px] grid-cols-7 gap-1.5 overflow-y-auto pr-1" role="listbox" aria-label="Iconos">
        {results.map((name, i) => {
          const active = current.name === name;
          const Glyph = ICON_LIBRARY[name] ?? Circle;
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={active}
              title={name}
              onClick={() => set({ name })}
              className={cx(
                "zs-in grid aspect-square place-items-center rounded-xl border transition duration-200 hover:-translate-y-0.5",
                active ? "border-[#50c9d5] bg-[#50c9d5]/20 text-[#17656c]" : "border-white/80 bg-white/60 text-slate-700 hover:border-[#50c9d5] hover:bg-white"
              )}
              style={{ ["--i" as string]: Math.min(i, 12) * 0.3 }}
            >
              <Glyph size={18} strokeWidth={1.8} />
            </button>
          );
        })}
        {!results.length ? <p className="col-span-7 py-4 text-center text-[13px] text-slate-500">No hay iconos con ese nombre.</p> : null}
      </div>

      <div>
        <span className={cx(zs.label, "mb-2 block")}>Color</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color del icono">
          {ICON_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={current.color === c}
              aria-label={ICON_TONE[c].label}
              title={ICON_TONE[c].label}
              onClick={() => set({ color: c })}
              className={cx(
                "zs-press h-8 w-8 rounded-full border-2 transition-transform duration-200 hover:scale-110",
                current.color === c ? "border-[#0d1b2a] ring-2 ring-white" : "border-white"
              )}
              style={{ background: ICON_TONE[c].swatch }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className={cx(zs.label, "mb-2 block")}>Tamaño</span>
        <div className="inline-flex gap-1 rounded-full border border-white/80 bg-white/70 p-1" role="radiogroup" aria-label="Tamaño del icono">
          {(Object.keys(ICON_PX) as IconSize[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={current.size === s}
              onClick={() => set({ size: s })}
              className={cx("zs-press rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", current.size === s ? "bg-[#50c9d5] text-[#080b04]" : "text-slate-600 hover:bg-white")}
            >
              {ICON_PX[s].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
