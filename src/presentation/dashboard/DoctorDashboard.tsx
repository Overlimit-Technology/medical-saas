"use client";

import { useDoctorDashboardViewModel } from "./DoctorDashboardViewModel";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_COLORS,
  formatCurrency,
  formatTime,
  StatCard,
  SkeletonCard,
  SkeletonBlock,
} from "./shared";
import {
  CalendarDays,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pill,
  RefreshCw,
} from "lucide-react";

export default function DoctorDashboard() {
  const { state, actions } = useDoctorDashboardViewModel();
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
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock h="h-48" />
          <SkeletonBlock h="h-48" />
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

  const { clinic, doctorName, specialty, kpis, topTreatments, appointmentsByStatus, todaySchedule } = data;

  const totalTreatmentCount = topTreatments.reduce((s, t) => s + t.count, 0) || 1;

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
            Hola, {doctorName}
          </h1>
          {specialty && <p className="text-sm text-slate-400">{specialty}</p>}
          <p className="text-xs text-slate-400 mt-1">
            {clinic.name}
            {clinic.city && <> · {clinic.city}</>}
          </p>
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700">
            Panel Doctor
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mis citas hoy"
          value={kpis.todayAppointments}
          icon={CalendarDays}
          iconColor="bg-blue-50 text-blue-600"
          delay={0}
        />
        <StatCard
          label="Mis pacientes"
          value={kpis.totalPatients}
          icon={Users}
          iconColor="bg-violet-50 text-violet-600"
          delay={60}
        />
        <StatCard
          label="Citas del mes"
          value={kpis.monthAppointments}
          delta={kpis.monthAppointmentsDelta}
          icon={Activity}
          iconColor="bg-emerald-50 text-emerald-600"
          delay={120}
        />
        <StatCard
          label="Mis ingresos del mes"
          value={formatCurrency(kpis.revenue)}
          delta={kpis.revenueDelta}
          icon={DollarSign}
          iconColor="bg-amber-50 text-amber-600"
          delay={180}
        />
      </div>

      {/* Second row: quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Completadas hoy", value: kpis.todayCompleted, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Pendientes hoy", value: kpis.todayScheduled, icon: Clock, color: "text-blue-600" },
          { label: "No asistieron", value: kpis.todayNoShow, icon: XCircle, color: "text-rose-500" },
          { label: "Asistencia hoy", value: `${kpis.attendanceRate}%`, icon: Activity, color: "text-indigo-600" },
        ].map((item, i) => (
          <div
            key={item.label}
            className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm animate-card-in"
            style={{ animationDelay: `${240 + i * 40}ms` }}
          >
            <item.icon size={16} className={`${item.color} mb-2`} />
            <p className="text-lg font-bold text-slate-900">{item.value}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Middle row: status + treatments */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Appointment status distribution */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "300ms" }}>
          <p className="text-sm font-semibold text-slate-900 mb-4">Mis citas del mes por estado</p>
          {appointmentsByStatus.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin datos este mes</p>
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
                          className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top treatments */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Mis tratamientos del mes</p>
            <Pill size={14} className="text-slate-400" />
          </div>
          {topTreatments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {topTreatments.map((treatment, i) => {
                const pct = ((treatment.count / totalTreatmentCount) * 100).toFixed(1);
                const colors = [
                  "bg-sky-400",
                  "bg-indigo-400",
                  "bg-emerald-400",
                  "bg-amber-400",
                  "bg-rose-400",
                ];
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{treatment.name}</p>
                        <p className="text-[10px] text-slate-400">{formatCurrency(treatment.price)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold text-slate-900">{treatment.count}</p>
                      <p className="text-[10px] text-slate-400">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's schedule */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm animate-card-in" style={{ animationDelay: "420ms" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <p className="text-sm font-semibold text-slate-900">Mi agenda de hoy</p>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {kpis.todayAppointments} citas
          </span>
        </div>
        {todaySchedule.length === 0 ? (
          <p className="text-xs text-slate-400 py-10 text-center">No tienes citas programadas para hoy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-medium">Hora</th>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Box</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedule.map((appt, i) => (
                  <tr
                    key={appt.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition animate-fade-in"
                    style={{ animationDelay: `${480 + i * 40}ms` }}
                  >
                    <td className="px-6 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                      {formatTime(appt.startAt)} – {formatTime(appt.endAt)}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{appt.patientName}</td>
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

      {/* Monthly summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-6 shadow-sm text-white animate-card-in" style={{ animationDelay: "480ms" }}>
        <p className="text-sm font-medium text-white/80 mb-3">Mi resumen del mes</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{kpis.monthAppointments}</p>
            <p className="text-xs text-white/70">Citas totales</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(kpis.revenue)}</p>
            <p className="text-xs text-white/70">Ingresos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{kpis.totalPatients}</p>
            <p className="text-xs text-white/70">Pacientes atendidos</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
          <TrendingUp size={14} className="text-white/70" />
          <span className="text-xs text-white/70">
            {kpis.monthAppointmentsDelta} citas vs mes anterior · {kpis.revenueDelta} ingresos
          </span>
        </div>
      </div>
    </div>
  );
}
