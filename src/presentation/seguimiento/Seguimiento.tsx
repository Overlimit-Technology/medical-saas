"use client";

import { useRouter } from "next/navigation";
import { useSeguimientoViewModel, type TabKey, type FilterKey } from "./SeguimientoViewModel";
import type { SeguimientoItem } from "@/domain/seguimiento/entities/SeguimientoItem";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tratamientos", label: "Tratamientos" },
  { key: "medicacion", label: "Medicación" },
  { key: "servicios", label: "Servicios" },
  { key: "metricas", label: "Métricas" },
  { key: "pagos", label: "Pagos" },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "in_progress", label: "En progreso" },
  { key: "completed", label: "Completado" },
];

function StatusBadge({ status }: { status: "in_progress" | "completed" }) {
  const isCompleted = status === "completed";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        isCompleted
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {isCompleted ? "Completado" : "Progreso"}
    </span>
  );
}

function TreatmentCard({ item, index }: { item: SeguimientoItem; index: number }) {
  const initials = item.patientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const treatmentNumber = item.treatmentId.replace(/\D/g, "").slice(-4).padStart(4, "0");

  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="animate-card-in rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Tratamiento #{treatmentNumber}
        </h3>
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">
            {item.patientName}
          </p>
          <p className="truncate text-xs text-slate-400">
            {item.treatmentName}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {item.notes ?? "sin detalles"}
      </p>
    </div>
  );
}

function NotificationsPanel() {
  const notifications = [
    {
      id: "1",
      icon: "calendar",
      text: "Nueva cita programada con María",
      time: "Hace 2h",
    },
    {
      id: "2",
      icon: "file",
      text: "Actualización de historial clínico",
      time: "Hace 3h",
    },
    {
      id: "3",
      icon: "message",
      text: "Nuevo mensaje disponible para revisión",
      time: "Hace 5h",
    },
    {
      id: "4",
      icon: "alert",
      text: "Recordatorio de cita para mañana",
      time: "Hace 6h",
    },
    {
      id: "5",
      icon: "user",
      text: "Nuevo mensaje de Dr. Rodríguez",
      time: "Hace 8h",
    },
  ];

  const iconMap: Record<string, JSX.Element> = {
    calendar: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    ),
    file: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    ),
    message: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    alert: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
    ),
    user: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Notificaciones</h2>
      <div className="mt-4 space-y-4">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50">
              {iconMap[n.icon]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">{n.text}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{n.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Actividades recientes
        </h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs text-slate-500">Tratamiento completado</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <p className="text-xs text-slate-500">Pago pendiente registrado</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <p className="text-xs text-slate-500">Nuevo seguimiento creado</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCards({
  stats,
}: {
  stats: { total: number; inProgress: number; completed: number; pendingPayments: number };
}) {
  const cards = [
    { label: "Total tratamientos", value: stats.total, color: "bg-slate-100 text-slate-700" },
    { label: "En progreso", value: stats.inProgress, color: "bg-amber-50 text-amber-700" },
    { label: "Completados", value: stats.completed, color: "bg-emerald-50 text-emerald-700" },
    { label: "Pagos pendientes", value: stats.pendingPayments, color: "bg-rose-50 text-rose-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.color.split(" ")[1]}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Seguimiento() {
  const router = useRouter();
  const { state, actions } = useSeguimientoViewModel();

  if (state.roleLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-slate-100" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!state.hasAccess) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          No tienes acceso a esta sección. Redirigiendo...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb / Banner paciente */}
      {state.patientIdFilter ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <button
            onClick={() => router.push(`/patients/${state.patientIdFilter}`)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <p className="text-xs text-blue-400">Desde perfil del paciente</p>
            <p className="text-sm font-medium text-blue-800">
              Mostrando tratamientos del paciente seleccionado
            </p>
          </div>
          <button
            onClick={() => router.push("/seguimiento")}
            className="ml-auto rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
          >
            Ver todos
          </button>
        </div>
      ) : (
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
          <span>Inicio</span>
          <span>/</span>
          <span className="text-slate-600">Seguimiento</span>
        </div>
      )}

      {/* Header */}
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Seguimiento</h1>

      {/* Stats */}
      <div className="mt-5">
        <StatsCards stats={state.stats} />
      </div>

      {/* Main content */}
      <div className="mt-6 flex gap-6">
        {/* Left: Tabs + Cards */}
        <div className="min-w-0 flex-1">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => actions.setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  state.activeTab === tab.key
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
                {state.activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-slate-900" />
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-4 flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => actions.setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  state.filter === f.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {state.activeTab === "tratamientos" && (
            <div className="mt-5">
              {state.loading && (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-2xl bg-slate-100" />
                  ))}
                </div>
              )}

              {!state.loading && state.error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
                  {state.error}
                </div>
              )}

              {!state.loading && !state.error && state.filteredItems.length === 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                  No hay tratamientos en seguimiento.
                </div>
              )}

              {!state.loading && !state.error && state.filteredItems.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {state.filteredItems.map((item, idx) => (
                    <TreatmentCard key={item.id} item={item} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {state.activeTab !== "tratamientos" && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
              Próximamente
            </div>
          )}
        </div>

        {/* Right: Notifications Panel */}
        <div className="hidden w-80 shrink-0 lg:block">
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}
