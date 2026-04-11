"use client";

import { useSecretaryDashboardViewModel } from "./SecretaryDashboardViewModel";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_COLORS,
  formatTime,
  StatCard,
  SkeletonCard,
  SkeletonBlock,
} from "./shared";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pill,
  RefreshCw,
} from "lucide-react";

export default function SecretaryDashboard() {
  const { state, actions } = useSecretaryDashboardViewModel();
  const { data, loading, error } = state;
  const { fetchData } = actions;

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonBlock />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500">
        <AlertCircle size={40} className="text-rose-400" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchData} className="text-sm text-indigo-600 underline hover:text-indigo-800">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { clinic, kpis, appointmentsByStatus, todayTreatments, recentAppointments } = data;

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 capitalize">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {clinic.name}
            {clinic.city && <span className="ml-2 text-base font-normal text-slate-400">· {clinic.city}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-100 px-3 py-1.5 text-xs font-medium text-teal-700">
            Panel Secretaria
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={kpis.todayAppointments}
          icon={CalendarDays}
          iconColor="bg-blue-50 text-blue-600"
          delay={0}
        />
        <StatCard
          label="Completadas"
          value={kpis.todayCompleted}
          icon={CheckCircle2}
          iconColor="bg-emerald-50 text-emerald-600"
          delay={60}
        />
        <StatCard
          label="Pendientes"
          value={kpis.todayScheduled}
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
          delay={120}
        />
        <StatCard
          label="Tratamientos hoy"
          value={kpis.todayTreatmentCount}
          icon={Pill}
          iconColor="bg-violet-50 text-violet-600"
          delay={180}
        />
      </div>

      {/* Middle row: status distribution + attendance */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Appointment status distribution */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "240ms" }}>
          <p className="text-sm font-semibold text-slate-900 mb-4">Estado de citas de hoy</p>
          {appointmentsByStatus.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin citas hoy</p>
          ) : (
            <div className="space-y-3">
              {appointmentsByStatus
                .sort((a, b) => b.count - a.count)
                .map((s) => {
                  const total = appointmentsByStatus.reduce((sum, x) => sum + x.count, 0) || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-300 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Attendance rate */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "300ms" }}>
          <p className="text-sm font-semibold text-slate-900 mb-4">Tasa de asistencia hoy</p>
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="url(#secAttendGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${kpis.attendanceRate * 0.974} 100`}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="secAttendGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{kpis.attendanceRate}%</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-600">Completadas: {kpis.todayCompleted}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="text-slate-600">No asistieron: {kpis.todayNoShow}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">Canceladas: {kpis.todayCancelled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-slate-600">Pendientes: {kpis.todayScheduled}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's treatments */}
      {todayTreatments.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm animate-card-in" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <p className="text-sm font-semibold text-slate-900">Tratamientos realizados hoy</p>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {todayTreatments.length} tratamientos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-medium">Hora</th>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Tratamiento</th>
                </tr>
              </thead>
              <tbody>
                {todayTreatments.map((t, i) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition animate-fade-in"
                    style={{ animationDelay: `${420 + i * 40}ms` }}
                  >
                    <td className="px-6 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                      {formatTime(t.performedAt)}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{t.patientName}</td>
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{t.treatmentName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm animate-card-in" style={{ animationDelay: "420ms" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <p className="text-sm font-semibold text-slate-900">Agenda de hoy</p>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {kpis.todayAppointments} citas programadas
          </span>
        </div>
        {recentAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-10 text-center">No hay citas programadas para hoy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-medium">Hora</th>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Doctor</th>
                  <th className="px-6 py-3 font-medium">Box</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((appt, i) => (
                  <tr
                    key={appt.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition animate-fade-in"
                    style={{ animationDelay: `${480 + i * 40}ms` }}
                  >
                    <td className="px-6 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                      {formatTime(appt.startAt)} – {formatTime(appt.endAt)}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{appt.patientName}</td>
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{appt.doctorName}</td>
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{appt.boxName}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-xs font-medium whitespace-nowrap ${PAYMENT_COLORS[appt.paymentStatus] ?? "text-slate-500"}`}>
                      {appt.paymentStatus === "PAID" ? "Pagado" : appt.paymentStatus === "PENDING" ? "Pendiente" : "Exento"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
