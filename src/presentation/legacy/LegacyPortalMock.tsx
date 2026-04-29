"use client";

import { type ComponentType, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  User,
  Users,
  Video,
  Waves,
  Wifi,
  Zap,
  LogOut,
} from "lucide-react";

type ViewKey =
  | "roadmap"
  | "progress"
  | "meetings"
  | "reports"
  | "requests"
  | "account";

const NAV_ITEMS: Array<{ key: ViewKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "roadmap", label: "Roadmap del proyecto", icon: Sparkles },
  { key: "progress", label: "Seguimiento del progreso", icon: Waves },
  { key: "meetings", label: "Reuniones y accesos", icon: CalendarDays },
  { key: "reports", label: "Reportes y resúmenes", icon: FileText },
  { key: "requests", label: "Solicitudes", icon: Zap },
  { key: "account", label: "Mi cuenta", icon: User },
];

const REPORT_FILTERS = ["Todos", "Levantamiento", "Configuración", "Informe", "Capacitación"];

const REQUEST_ROWS = [
  {
    title: "Agregar nueva prestación: Ecocardiograma",
    date: "18/04/2026",
    type: "Cambio de configuración",
    priority: "Alta",
    status: "En revisión",
    color: "amber",
  },
  {
    title: "Error al generar boleta electrónica N°00123",
    date: "10/04/2026",
    type: "Soporte técnico",
    priority: "Alta",
    status: "Resuelto",
    color: "emerald",
  },
  {
    title: "¿Cuándo estará disponible el módulo de telemedicina?",
    date: "05/04/2026",
    type: "Consulta",
    priority: "Normal",
    status: "Respondido",
    color: "cyan",
  },
];

const REPORT_ROWS = [
  ["Levantamiento de procesos clínicos", "12/03/2026", "Pablo Reyes", "Levantamiento", "2.4 MB", "PDF"],
  ["Propuesta de configuración — Módulo Agenda", "28/03/2026", "Pablo Reyes", "Configuración", "1.8 MB", "PDF"],
  ["Informe de avance — Semana 7", "15/04/2026", "Pablo Reyes", "Informe", "0.9 MB", "PDF"],
  ["Manual de usuario — Recepción", "30/04/2026", "Pablo Reyes", "Capacitación", "Pendiente", "—"],
  ["Informe de avance — Semana 12", "12/05/2026", "Pablo Reyes", "Informe", "Pendiente", "—"],
];

const MEETINGS = [
  ["Revisión de prestaciones cargadas", "25/04/2026 · 15:00 hrs", "Dra. Lorena Flores · Karla Flores · Pablo Reyes"],
  ["Revisión módulo de agenda médica", "06/05/2026 · 10:00 hrs", "Dra. Lorena Flores · Pablo Reyes"],
  ["Validación flujos de caja y facturación", "20/05/2026 · 15:00 hrs", "Dra. Lorena Flores · Pablo Reyes"],
];

const ACCOUNT_USERS = [
  ["Dra. Lorena Flores", "l.flores@clinicamunay.cl", "Administrador", "Completado"],
  ["Karla Flores", "k.flores@clinicamunay.cl", "Administrador", "Completado"],
];

const ROADMAP_PHASES = [
  { label: "Kick-off y levantamiento", owner: "Pablo Reyes", start: "03/03/2026", end: "16/03/2026", state: "Completado", progress: 100, tone: "emerald" },
  { label: "Configuración", owner: "Pablo Reyes", start: "17/03/2026", end: "27/04/2026", state: "En curso", progress: 67, tone: "cyan" },
  { label: "Capacitación", owner: "Pablo Reyes", start: "28/04/2026", end: "08/06/2026", state: "Próximo", progress: 0, tone: "slate" },
  { label: "Piloto y puesta en marcha", owner: "Pablo Reyes", start: "09/06/2026", end: "20/07/2026", state: "Próximo", progress: 0, tone: "slate" },
  { label: "Seguimiento continuo", owner: "Pablo Reyes", start: "21/07/2026", end: "18/08/2026", state: "Próximo", progress: 0, tone: "slate" },
];

const WEEK_PROGRESS = [5, 12, 18, 22, 28, 33, 38, 42];

function badgeClass(tone: "emerald" | "amber" | "cyan" | "slate") {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "cyan") return "bg-cyan-50 text-cyan-700";
  return "bg-slate-100 text-slate-600";
}

export default function LegacyPortalMock() {
  const [activeView, setActiveView] = useState<ViewKey>("roadmap");
  const [reportFilter, setReportFilter] = useState("Todos");

  const header = useMemo(() => {
    switch (activeView) {
      case "roadmap":
        return {
          title: "Roadmap del proyecto",
          subtitle: "Su proyecto avanza según lo planeado. Fase actual: Configuración",
        };
      case "progress":
        return {
          title: "Seguimiento del progreso",
          subtitle: "Vista resumen del avance general del proyecto de implementación.",
        };
      case "meetings":
        return {
          title: "Reuniones y accesos",
          subtitle: "Gestione sus sesiones de trabajo con el equipo Zensya.",
        };
      case "reports":
        return {
          title: "Reportes y resúmenes",
          subtitle: "Documentación oficial de su proyecto Zensya.",
        };
      case "requests":
        return {
          title: "Solicitudes",
          subtitle: "Comuníquese directamente con el equipo Zensya para soporte, cambios o consultas.",
        };
      case "account":
        return {
          title: "Mi cuenta",
          subtitle: "Datos de su organización y preferencias del sistema.",
        };
    }
  }, [activeView]);

  return (
    <main className="min-h-screen bg-[#f7fafc] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[235px] shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col">
          <div className="p-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Cliente</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Clínica Munay</p>
              <p className="mt-1 text-sm text-slate-500">RUT 77.123.456-8</p>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Cliente Zensya
            </div>
          </div>

          <div className="px-3 pb-4">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Menú</p>
            <nav className="mt-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeView;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveView(item.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                      active
                        ? "bg-cyan-50 text-[#0d90a0] shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-200 px-5 py-4">
            <form action="/api/auth/logout" method="post" className="mb-4">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
            <p className="text-sm text-slate-500">Sistema operativo</p>
            <p className="mt-1 text-xs text-slate-400">Zensya HIS v2.4.1</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{header.title}</h1>
                <p className="mt-1 text-sm text-slate-500">Bienvenida de vuelta, Dra. Flores · 22/04/2026</p>
              </div>

              <div className="flex items-center gap-3">
                <button className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 md:inline-flex">
                  <Search className="h-4 w-4" />
                  Comunidad Privada
                </button>
                <button className="rounded-xl border border-slate-200 p-2.5 text-slate-500">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#177f9f] text-sm font-semibold text-white">
                    LF
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Dra. Lorena Flores</p>
                    <p className="text-xs text-slate-500">Administrador</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="flex-1 px-6 py-6 lg:px-8">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.45)]">
              <div className="mb-6 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-white px-5 py-4 text-sm text-cyan-800">
                Vista demo del portal clásico. Estas pantallas son referenciales por ahora y no tienen funcionalidad real.
              </div>

              {activeView === "roadmap" && <RoadmapView />}
              {activeView === "progress" && <ProgressView />}
              {activeView === "meetings" && <MeetingsView />}
              {activeView === "reports" && (
                <ReportsView reportFilter={reportFilter} onChangeFilter={setReportFilter} />
              )}
              {activeView === "requests" && <RequestsView />}
              {activeView === "account" && <AccountView />}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function RoadmapView() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Su proyecto avanza según lo planeado. Fase actual: <span className="font-semibold text-cyan-700">Configuración</span></p>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Avance total" value="42%" hint="Semana 7 de 24" tone="cyan" />
        <StatCard label="Hitos cumplidos" value="6" hint="de 14 en total" tone="emerald" />
        <StatCard label="Hitos pendientes" value="8" hint="próximo: 29/04/2026" tone="amber" />
        <StatCard label="Fase actual" value="Configuración" hint="Vence 27/04/2026" tone="slate" large />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Carta Gantt del proyecto</h2>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Completado</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-cyan-700" />En curso</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-slate-200" />Próximo</span>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 grid grid-cols-[240px_repeat(6,minmax(0,1fr))] gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span />
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
          </div>

          <div className="space-y-4">
            {ROADMAP_PHASES.map((phase) => (
              <div key={phase.label} className="grid grid-cols-[240px_minmax(0,1fr)] gap-4">
                <div className="pt-1">
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-3 w-3 rounded-full ${phase.tone === "emerald" ? "bg-emerald-500" : phase.tone === "cyan" ? "bg-cyan-700" : "bg-slate-300"}`} />
                    <div>
                      <p className="font-medium text-slate-900">{phase.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{phase.owner}</p>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-amber-300/80" />
                  <div
                    className={`relative h-6 rounded-full ${
                      phase.tone === "emerald"
                        ? "bg-emerald-500"
                        : phase.tone === "cyan"
                          ? "bg-cyan-800"
                          : "bg-slate-200"
                    }`}
                    style={{ width: `${phase.progress > 0 ? Math.max(phase.progress, 18) : 42}%` }}
                  >
                    {phase.progress > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                        {phase.progress}%
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {phase.start} — {phase.end}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Detalle de fases</h3>
            </div>
            {ROADMAP_PHASES.map((phase) => (
              <div key={`${phase.label}-detail`} className="grid grid-cols-[1.8fr_repeat(3,minmax(0,1fr))] items-center border-b border-slate-100 px-6 py-4 last:border-b-0">
                <p className={`font-medium ${phase.label === "Configuración" ? "text-slate-900" : "text-slate-600"}`}>{phase.label}</p>
                <p className="text-sm text-slate-500">{phase.start}</p>
                <p className="text-sm text-slate-500">{phase.end}</p>
                <div className="flex items-center justify-end gap-4">
                  <div className="h-2.5 w-28 rounded-full bg-slate-100">
                    <div
                      className={`h-2.5 rounded-full ${
                        phase.tone === "emerald"
                          ? "bg-emerald-500"
                          : phase.tone === "cyan"
                            ? "bg-cyan-800"
                            : "bg-slate-300"
                      }`}
                      style={{ width: `${phase.progress > 0 ? phase.progress : 70}%` }}
                    />
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(phase.tone as "emerald" | "amber" | "cyan" | "slate")}`}>
                    {phase.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressView() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Implementación total" value="42%" hint="En tiempo según plan" tone="cyan" />
        <StatCard label="Hitos cumplidos" value="6" hint="Última: Mapeo de agenda" tone="emerald" />
        <StatCard label="Hitos pendientes" value="8" hint="Próximo: 29/04/2026" tone="amber" />
        <StatCard label="Próximo entregable" value="Configuración Módulos" hint="Vence 29/04/2026" tone="slate" large />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <span className="font-semibold">Atención:</span> La carga de prestaciones pendiente puede impactar el cierre de la fase de Configuración. Coordinada para el 29/04.
      </div>

      <div className="rounded-3xl border border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">Avance semanal (%)</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {WEEK_PROGRESS.map((value, index) => (
            <div key={index} className="rounded-2xl bg-slate-50 px-3 py-4">
              <p className="text-center text-sm font-semibold text-slate-600">{value}%</p>
              <div className="mt-3 h-28 rounded-xl bg-slate-200/80 p-1">
                <div
                  className={`${index === WEEK_PROGRESS.length - 1 ? "bg-cyan-800" : "bg-cyan-100"} rounded-[10px]`}
                  style={{ height: `${Math.max(value * 2, 12)}px`, marginTop: `${Math.max(100 - value * 2, 0)}px` }}
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">Sem {index + 1}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Hitos del proyecto</h2>
        </div>
        {[
          ["Kick-off realizado", "03/03/2026", "Completado", "emerald"],
          ["Levantamiento de procesos completado", "12/03/2026", "Completado", "emerald"],
          ["Configuración de usuarios base", "20/03/2026", "Completado", "emerald"],
          ["Carga de prestaciones médicas", "29/04/2026", "Próximo", "slate"],
          ["Configuración módulo de agenda", "06/05/2026", "Próximo", "slate"],
          ["Inicio capacitación recepción", "28/04/2026", "Próximo", "slate"],
        ].map(([label, date, status, tone]) => (
          <div key={label} className="grid grid-cols-[1.6fr_180px_160px] items-center border-b border-slate-100 px-6 py-5 last:border-b-0">
            <div className="flex items-center gap-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${tone === "emerald" ? "border-emerald-500 text-emerald-600" : "border-slate-300 text-slate-300"}`}>
                {tone === "emerald" ? <Check className="h-4 w-4" /> : null}
              </span>
              <p className={`font-medium ${tone === "emerald" ? "text-slate-500 line-through" : "text-slate-900"}`}>{label}</p>
            </div>
            <p className="text-sm text-slate-500">{date}</p>
            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(tone as "emerald" | "amber" | "cyan" | "slate")}`}>
                {status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingsView() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-cyan-100 bg-gradient-to-r from-cyan-50 to-white px-7 py-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Próxima reunión</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Revisión de prestaciones cargadas</h2>
            <p className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />25/04/2026 · 15:00 hrs</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Dra. Lorena Flores, Karla Flores, Pablo Reyes</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                ["01", "Días"],
                ["22", "HRS"],
                ["50", "MIN"],
                ["38", "SEG"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-4xl font-semibold text-cyan-800">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-cyan-800 px-5 py-4 text-sm font-semibold text-white">
              <Video className="h-4 w-4" />
              Unirse a la videollamada
            </button>
          </div>
        </div>
      </div>

      <div className="inline-flex rounded-2xl bg-slate-100 p-1">
        <button className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm">Próximas reuniones</button>
        <button className="rounded-2xl px-5 py-2 text-sm font-semibold text-slate-500">Historial</button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        {MEETINGS.map(([title, date, members]) => (
          <div key={title} className="grid grid-cols-[72px_1fr_120px] items-center border-b border-slate-100 px-6 py-5 last:border-b-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{date} · {members}</p>
            </div>
            <button className="justify-self-end text-sm font-semibold text-cyan-700">
              Acceder
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsView({
  reportFilter,
  onChangeFilter,
}: {
  reportFilter: string;
  onChangeFilter: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <StatCard label="Docs entregados" value="3" hint="Listos para descarga" tone="emerald" />
        <StatCard label="Docs pendientes" value="2" hint="Próximo: 30/04/2026" tone="amber" />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value=""
            readOnly
            placeholder="Buscar documento..."
            className="w-full bg-transparent text-sm text-slate-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {REPORT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onChangeFilter(filter)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                reportFilter === filter
                  ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-700"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="grid grid-cols-[1.8fr_140px_120px_170px_110px_90px] border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <span>Documento</span>
          <span>Fecha</span>
          <span>Autor</span>
          <span>Tipo</span>
          <span>Tamaño</span>
          <span />
        </div>

        {REPORT_ROWS.map(([name, date, author, type, size, cta], index) => (
          <div key={`${name}-${index}`} className="grid grid-cols-[1.8fr_140px_120px_170px_110px_90px] items-center border-b border-slate-100 px-6 py-4 last:border-b-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <FolderOpen className="h-4 w-4" />
              </div>
              <p className="font-medium text-slate-900">{name}</p>
            </div>
            <p className="text-sm text-slate-500">{date}</p>
            <p className="text-sm text-slate-500">{author}</p>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{type}</span>
            <p className="text-sm text-slate-500">{size}</p>
            <div className="text-right">
              {cta === "PDF" ? (
                <button className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">PDF</button>
              ) : (
                <span className="text-sm text-slate-400">Pendiente</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="rounded-2xl bg-cyan-800 px-6 py-3 text-sm font-semibold text-white shadow-sm">+ Nueva solicitud</button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total solicitudes" value="3" hint="Historial completo" tone="cyan" />
        <StatCard label="En revisión" value="1" hint="Resp. en <24 hrs hábiles" tone="amber" />
        <StatCard label="Resueltas" value="1" hint="Cerradas con éxito" tone="emerald" />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        Como cliente Premium, su tiempo de respuesta garantizado es de <span className="font-semibold">24 horas hábiles</span>. Para urgencias puede contactar a su ejecutivo directo.
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="grid grid-cols-[1.8fr_180px_120px_160px_40px] border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <span>Solicitud</span>
          <span>Tipo</span>
          <span>Prioridad</span>
          <span>Estado</span>
          <span />
        </div>

        {REQUEST_ROWS.map((row) => (
          <div key={row.title} className="grid grid-cols-[1.8fr_180px_120px_160px_40px] items-center border-b border-slate-100 px-6 py-5 last:border-b-0">
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              <p className="mt-1 text-sm text-slate-500">{row.date}</p>
            </div>
            <p className="text-sm text-slate-500">{row.type}</p>
            <p className={`text-sm font-medium ${row.priority === "Alta" ? "text-amber-600" : "text-slate-500"}`}>{row.priority}</p>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(row.color as "emerald" | "amber" | "cyan" | "slate")}`}>
              {row.status}
            </span>
            <ChevronDown className="justify-self-end text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountView() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <SectionHeader icon={<FolderOpen className="h-4 w-4" />} title="Datos de la clínica" />
          <InfoRow label="Razón social" value="Clínica Munay SpA" />
          <InfoRow label="RUT" value="77.123.456-8" />
          <InfoRow label="Dirección" value="Av. Providencia 1.650, Providencia" />
          <InfoRow label="Ciudad" value="Santiago, Región Metropolitana" />
          <InfoRow label="Teléfono" value="+56 2 2890 4512" />
          <InfoRow label="Email contacto" value="l.flores@clinicamunay.cl" />
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <SectionHeader icon={<Wifi className="h-4 w-4" />} title="Conexión con SII" />
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">Boletas electrónicas</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Conectado
                </span>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Integración activa con SII. Certificado digital válido hasta 12/2026.
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <SectionHeader icon={<FileText className="h-4 w-4" />} title="Facturación" />
            <InfoRow label="Plan" value="Zensya Premium" />
            <InfoRow label="Ciclo" value="Mensual" />
            <InfoRow label="Próximo cobro" value="01/05/2026" />
            <InfoRow label="Monto" value="$490.000 CLP" highlighted />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <SectionHeader icon={<User className="h-4 w-4" />} title="Su ejecutivo de cuenta" />
        <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#177f9f] text-lg font-semibold text-white">PR</div>
            <div>
              <p className="text-xl font-semibold text-slate-900">Pablo Reyes</p>
              <p className="text-sm text-slate-500">Customer Success Manager</p>
              <p className="mt-2 text-sm text-slate-500">pablo.reyes@zensya.cl · +56 9 8180 8448</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">
              <MessageSquare className="h-4 w-4" />
              Email
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <Phone className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Usuarios autorizados</h2>
          </div>
          <button className="rounded-2xl bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">+ Invitar usuario</button>
        </div>

        {ACCOUNT_USERS.map(([name, email, role, state]) => (
          <div key={email} className="grid grid-cols-[1fr_140px_140px] items-center border-b border-slate-100 px-6 py-5 last:border-b-0">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-50 text-sm font-semibold text-cyan-700">
                {name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">{email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{role}</span>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{state}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  large = false,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "amber" | "cyan" | "slate";
  large?: boolean;
}) {
  const accent =
    tone === "emerald"
      ? "border-t-4 border-t-emerald-500"
      : tone === "amber"
        ? "border-t-4 border-t-amber-500"
        : tone === "cyan"
          ? "border-t-4 border-t-cyan-700"
          : "border-t-4 border-t-amber-700";

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white px-6 py-5 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-4 font-semibold text-slate-900 ${large ? "text-[2.4rem] leading-none" : "text-[3rem] leading-none"}`}>{value}</p>
      <p className="mt-3 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
      <span className="text-slate-500">{icon}</span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center border-b border-slate-100 px-6 py-4 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-right text-sm ${highlighted ? "font-semibold text-cyan-700" : "font-medium text-slate-900"}`}>{value}</span>
    </div>
  );
}
