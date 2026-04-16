"use client";

import {
  useAdminDashboardViewModel,
} from "@/presentation/dashboard/AdminDashboardViewModel";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_COLORS,
  formatCurrency,
  formatTime,
  formatPaymentLabel,
  StatCard,
  SkeletonCard,
  SkeletonBlock,
} from "@/presentation/dashboard/shared";
import {
  CalendarDays,
  Users,
  UserCheck,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Pill,
  DoorOpen,
  RefreshCw,
} from "lucide-react";

export default function AdminDashboard() {
  const { state, actions } = useAdminDashboardViewModel();
  const { data, loading, error } = state;
  const { fetchData } = actions;

  /* ----- Loading skeleton ----- */
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonBlock h="h-48" />
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
        <button
          onClick={fetchData}
          className="text-sm text-[#19b3bc] underline hover:text-[#159ea7]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { clinic, kpis, topDoctors, topTreatments, appointmentsByStatus, recentAppointments } = data;

  const maxDoctorCount = topDoctors.length ? Math.max(...topDoctors.map((d) => d.count)) : 1;
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#19b3bc]/15 bg-[#19b3bc]/10 px-3 py-1.5 text-xs font-medium text-[#0f8f98]">
            Panel Administrativo
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={kpis.todayAppointments}
          icon={CalendarDays}
          iconColor="bg-cyan-50 text-cyan-700"
          delay={0}
        />
        <StatCard
          label="Pacientes nuevos"
          value={kpis.newPatientsMonth}
          delta={kpis.newPatientsDelta}
          icon={Users}
          iconColor="bg-[#e8f8f9] text-[#0f8f98]"
          delay={60}
        />
        <StatCard
          label="Citas del mes"
          value={kpis.monthAppointments}
          delta={kpis.monthAppointmentsDelta}
          icon={Activity}
          iconColor="bg-teal-50 text-teal-700"
          delay={120}
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(kpis.revenue)}
          delta={kpis.revenueDelta}
          icon={DollarSign}
          iconColor="bg-[#e8f8f9] text-[#19b3bc]"
          delay={180}
          highlighted
        />
      </div>

      {/* Second row: quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Completadas hoy", value: kpis.todayCompleted, icon: CheckCircle2, color: "text-[#0f8f98]" },
          { label: "Pendientes hoy", value: kpis.todayScheduled, icon: Clock, color: "text-cyan-700" },
          { label: "No asistieron", value: kpis.todayNoShow, icon: XCircle, color: "text-red-500" },
          { label: "Total pacientes", value: kpis.totalPatients, icon: UserCheck, color: "text-slate-700" },
          { label: "Doctores activos", value: kpis.totalDoctors, icon: Stethoscope, color: "text-[#19b3bc]" },
          { label: "Boxes activos", value: kpis.totalBoxes, icon: DoorOpen, color: "text-teal-700" },
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

      {/* Middle row: status distribution + doctors + treatments */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Appointment status distribution */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "300ms" }}>
          <p className="text-sm font-semibold text-slate-900 mb-4">Estado de citas del mes</p>
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
                          className="h-1.5 rounded-full bg-gradient-to-r from-[#19b3bc] to-cyan-300 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top doctors */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Top doctores del mes</p>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Agendamientos</span>
          </div>
          {topDoctors.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doctor, i) => {
                const pct = Math.round((doctor.count / maxDoctorCount) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm text-slate-700 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f8f9] text-[10px] font-bold text-[#0f8f98] shrink-0">
                          {doctor.name.charAt(0)}
                        </span>
                        <span className="truncate text-sm">{doctor.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">{doctor.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-[#19b3bc] to-teal-300 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {doctor.specialty && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{doctor.specialty}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top treatments */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "420ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Tratamientos más realizados</p>
            <Pill size={14} className="text-slate-400" />
          </div>
          {topTreatments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {topTreatments.map((treatment, i) => {
                const pct = ((treatment.count / totalTreatmentCount) * 100).toFixed(1);
                const colors = [
                  "bg-[#19b3bc]",
                  "bg-cyan-400",
                  "bg-teal-400",
                  "bg-[#7adbe1]",
                  "bg-[#0f8f98]",
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
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm animate-card-in" style={{ animationDelay: "480ms" }}>
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
                    style={{ animationDelay: `${540 + i * 40}ms` }}
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
                      {formatPaymentLabel(appt.paymentStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance donut summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "540ms" }}>
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
                  stroke="url(#attendanceGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${kpis.attendanceRate * 0.974} 100`}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="attendanceGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#19b3bc" />
                    <stop offset="100%" stopColor="#7adbe1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{kpis.attendanceRate}%</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#19b3bc]" />
                <span className="text-slate-600">Completadas: {kpis.todayCompleted}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="text-slate-600">No asistieron: {kpis.todayNoShow}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">Canceladas: {kpis.todayCancelled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-600">Pendientes: {kpis.todayScheduled}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#19b3bc] to-[#0f8f98] p-6 shadow-sm text-white animate-card-in" style={{ animationDelay: "600ms" }}>
          <p className="text-sm font-medium text-white/80 mb-3">Resumen del mes</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{kpis.monthAppointments}</p>
              <p className="text-xs text-white/70">Citas totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(kpis.revenue)}</p>
              <p className="text-xs text-white/70">Ingresos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.newPatientsMonth}</p>
              <p className="text-xs text-white/70">Pacientes nuevos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.totalDoctors}</p>
              <p className="text-xs text-white/70">Doctores activos</p>
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
    </div>
  );
}
