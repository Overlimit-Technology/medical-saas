"use client";

import { useEffect, useMemo, useState } from "react";

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
  AlertCircle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock,
  Pill,
  RefreshCw,
} from "lucide-react";

type SecretaryAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  patientName: string;
  doctorName: string;
  boxName: string;
};

type WaitingRoomStatus = "waiting" | "ready" | "delayed";

type WaitingRoomEntry = {
  id: string;
  patientName: string;
  doctorName: string;
  boxName: string;
  startAt: string;
  endAt: string;
  appointmentLabel: string;
  status: WaitingRoomStatus;
  delayMinutes: number;
  notifiedAt: string | null;
  initials: string;
};

type WaitingRoomNotification = {
  id: string;
  doctorName: string;
  message: string;
  createdAt: string;
};

const APPOINTMENT_LABELS = ["consulta", "control", "revisión", "seguimiento"];

const WAITING_ROOM_STATUS_LABELS: Record<WaitingRoomStatus, string> = {
  waiting: "En espera",
  ready: "En sala",
  delayed: "Con demora",
};

const WAITING_ROOM_STATUS_STYLES: Record<WaitingRoomStatus, string> = {
  waiting: "border-slate-200 bg-white text-slate-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delayed: "border-amber-200 bg-amber-50 text-amber-700",
};

const CARD_BUTTON_STYLES: Record<WaitingRoomStatus, string> = {
  waiting: "bg-slate-600 text-white hover:bg-slate-700",
  ready: "bg-slate-900 text-white",
  delayed: "bg-amber-100 text-amber-800 hover:bg-amber-200",
};

function buildTodayIso(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const FALLBACK_WAITING_ROOM_APPOINTMENTS: SecretaryAppointment[] = [
  {
    id: "waiting-room-1",
    startAt: buildTodayIso(9, 0),
    endAt: buildTodayIso(9, 20),
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    patientName: "Katherine Moss",
    doctorName: "Dr. Martínez",
    boxName: "Box 2",
  },
  {
    id: "waiting-room-2",
    startAt: buildTodayIso(11, 0),
    endAt: buildTodayIso(11, 20),
    status: "SCHEDULED",
    paymentStatus: "PENDING",
    patientName: "Orlando Diggs",
    doctorName: "Dra. Gómez",
    boxName: "Box 1",
  },
  {
    id: "waiting-room-3",
    startAt: buildTodayIso(15, 0),
    endAt: buildTodayIso(15, 20),
    status: "CONFIRMED",
    paymentStatus: "PAID",
    patientName: "Juan Pérez",
    doctorName: "Dr. Martínez",
    boxName: "Box 4",
  },
  {
    id: "waiting-room-4",
    startAt: buildTodayIso(16, 40),
    endAt: buildTodayIso(17, 0),
    status: "SCHEDULED",
    paymentStatus: "PENDING",
    patientName: "Carlos Valenzuela",
    doctorName: "Dra. Gómez",
    boxName: "Box 3",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildWaitingRoomEntries(appointments: SecretaryAppointment[]) {
  const source =
    appointments.length >= 4
      ? appointments.slice(0, 4)
      : [...appointments, ...FALLBACK_WAITING_ROOM_APPOINTMENTS.slice(0, 4 - appointments.length)];

  return source.map((appointment, index) => ({
    id: appointment.id,
    patientName: appointment.patientName,
    doctorName: appointment.doctorName,
    boxName: appointment.boxName,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    appointmentLabel: APPOINTMENT_LABELS[index % APPOINTMENT_LABELS.length],
    status: "waiting" as const,
    delayMinutes: 10 + index * 5,
    notifiedAt: null,
    initials: getInitials(appointment.patientName),
  }));
}

function getWaitingTimeLabel(entry: WaitingRoomEntry) {
  if (entry.status === "ready") return "Listo para ingreso";
  if (entry.status === "delayed") return `${entry.delayMinutes} min`;
  return "Pendiente";
}

function createNotificationMessage(entry: WaitingRoomEntry) {
  if (entry.status === "delayed") {
    return `${entry.patientName} llegará con ${entry.delayMinutes} min de retraso a la cita de ${formatTime(entry.startAt)}.`;
  }

  if (entry.status === "ready") {
    return `${entry.patientName} ya está en recepción para la cita de ${formatTime(entry.startAt)}.`;
  }

  return `${entry.patientName} espera en recepción para la cita de ${formatTime(entry.startAt)}.`;
}

export default function SecretaryDashboard() {
  const { state, actions } = useSecretaryDashboardViewModel();
  const { data, loading, error } = state;
  const { fetchData } = actions;
  const [waitingRoomEntries, setWaitingRoomEntries] = useState<WaitingRoomEntry[]>([]);
  const [notifications, setNotifications] = useState<WaitingRoomNotification[]>([]);
  const recentAppointments = useMemo(() => data?.recentAppointments ?? [], [data?.recentAppointments]);
  const waitingRoomSeed = useMemo(
    () => buildWaitingRoomEntries(recentAppointments as SecretaryAppointment[]),
    [recentAppointments],
  );

  useEffect(() => {
    setWaitingRoomEntries(waitingRoomSeed);
    setNotifications([]);
  }, [waitingRoomSeed]);

  const waitingRoomSummary = useMemo(() => {
    const ready = waitingRoomEntries.filter((entry) => entry.status === "ready").length;
    const delayed = waitingRoomEntries.filter((entry) => entry.status === "delayed").length;
    const waiting = waitingRoomEntries.filter((entry) => entry.status === "waiting").length;
    const notified = waitingRoomEntries.filter((entry) => entry.notifiedAt).length;

    return { ready, delayed, waiting, notified };
  }, [waitingRoomEntries]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock h="h-[420px]" />
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

  const { clinic, kpis, appointmentsByStatus, todayTreatments } = data;

  const today = new Date().toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markPatientAsArrived = (id: string) => {
    setWaitingRoomEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: "ready",
              notifiedAt: null,
            }
          : entry,
      ),
    );
  };

  const markPatientAsDelayed = (id: string) => {
    setWaitingRoomEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;

        const nextDelay = entry.status === "delayed" ? Math.min(entry.delayMinutes + 5, 45) : entry.delayMinutes;

        return {
          ...entry,
          status: "delayed",
          delayMinutes: nextDelay,
          notifiedAt: null,
        };
      }),
    );
  };

  const notifyDoctor = (id: string) => {
    const entry = waitingRoomEntries.find((currentEntry) => currentEntry.id === id);
    if (!entry) return;

    const createdAt = new Date().toISOString();

    setWaitingRoomEntries((current) =>
      current.map((currentEntry) =>
        currentEntry.id === id
          ? {
              ...currentEntry,
              notifiedAt: createdAt,
            }
          : currentEntry,
      ),
    );

    setNotifications((current) => [
      {
        id: `${id}-${createdAt}`,
        doctorName: entry.doctorName,
        message: createNotificationMessage(entry),
        createdAt,
      },
      ...current,
    ].slice(0, 4));
  };

  return (
    <div className="space-y-6">
      <section
        className="animate-card-in overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_24px_60px_-52px_rgba(15,23,42,0.55)] sm:p-4"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Recepción</h1>
            <p className="mt-0.5 text-sm text-slate-500 capitalize">{today}</p>
            <p className="mt-2 text-xs text-slate-500">
              {clinic.name}
              {clinic.city ? ` · ${clinic.city}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 size={12} />
              {waitingRoomSummary.ready} en sala
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              <CircleAlert size={12} />
              {waitingRoomSummary.delayed} con demora
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <BellRing size={12} />
              {waitingRoomSummary.notified} avisos enviados
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-slate-950 px-3 py-2.5 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
              <BellRing size={14} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">Notificaciones</p>
              <p className="text-xs text-white/65">Avisos recientes al equipo médico.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 2).map((notification) => (
                <div key={notification.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-medium text-white">{notification.doctorName}</span>
                    <span className="text-white/45">{formatTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 max-w-[320px] truncate text-xs text-white/70">{notification.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
                Aun no hay avisos enviados.
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[20px] border border-slate-200 bg-white/90 p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">Citas de hoy</h2>
                  <p className="text-xs text-slate-500">{waitingRoomEntries.length} pacientes en agenda</p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {waitingRoomEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold tracking-tight text-slate-950">
                        {formatTime(entry.startAt)} - {formatTime(entry.endAt)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{entry.patientName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.doctorName} · {entry.boxName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium lowercase text-slate-700">
                        {entry.appointmentLabel}
                      </span>
                      <button
                        onClick={() => markPatientAsArrived(entry.id)}
                        disabled={entry.status === "ready"}
                        className={`min-w-[74px] rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default disabled:opacity-100 ${CARD_BUTTON_STYLES[entry.status]}`}
                      >
                        {entry.status === "ready" ? "En sala" : "Llegó"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${WAITING_ROOM_STATUS_STYLES[entry.status]}`}
                    >
                      {WAITING_ROOM_STATUS_LABELS[entry.status]}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {entry.status === "delayed"
                        ? `Llegada estimada en ${entry.delayMinutes} min`
                        : entry.notifiedAt
                          ? `Avisado ${formatTime(entry.notifiedAt)}`
                          : "Pendiente de aviso"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white/90 p-3.5 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <Clock size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">Sala de espera</h2>
                  <p className="text-xs text-slate-500">{waitingRoomSummary.waiting} pacientes pendientes de ingreso</p>
                </div>
              </div>
            </div>

            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="px-3 py-3 font-medium">Paciente</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Espera</th>
                    <th className="px-3 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingRoomEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 text-xs last:border-b-0">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900">
                            {entry.initials}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{entry.patientName}</p>
                            <p className="text-[11px] text-slate-500">
                              {entry.doctorName} · {formatTime(entry.startAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${WAITING_ROOM_STATUS_STYLES[entry.status]}`}
                        >
                          {WAITING_ROOM_STATUS_LABELS[entry.status]}
                        </span>
                        {entry.notifiedAt ? (
                          <p className="mt-1 text-[10px] text-slate-400">Avisado {formatTime(entry.notifiedAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5 text-slate-700">{getWaitingTimeLabel(entry)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => notifyDoctor(entry.id)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                          >
                            {entry.notifiedAt ? "Reenviar" : "Notificar"}
                          </button>
                          <button
                            onClick={() => markPatientAsDelayed(entry.id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          >
                            Demorar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-card-in"
          style={{ animationDelay: "240ms" }}
        >
          <p className="mb-4 text-sm font-semibold text-slate-900">Estado de citas de hoy</p>
          {appointmentsByStatus.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">Sin citas hoy</p>
          ) : (
            <div className="space-y-3">
              {appointmentsByStatus
                .sort((a, b) => b.count - a.count)
                .map((statusRow) => {
                  const total = appointmentsByStatus.reduce((sum, item) => sum + item.count, 0) || 1;
                  const percentage = Math.round((statusRow.count / total) * 100);

                  return (
                    <div key={statusRow.status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[statusRow.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {STATUS_LABELS[statusRow.status] ?? statusRow.status}
                        </span>
                        <span className="tabular-nums text-xs text-slate-500">
                          {statusRow.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-300 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-card-in"
          style={{ animationDelay: "300ms" }}
        >
          <p className="mb-4 text-sm font-semibold text-slate-900">Tasa de asistencia hoy</p>
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

      {todayTreatments.length > 0 && (
        <div
          className="rounded-2xl border border-slate-100 bg-white shadow-sm animate-card-in"
          style={{ animationDelay: "360ms" }}
        >
          <div className="flex items-center justify-between px-6 pb-2 pt-6">
            <p className="text-sm font-semibold text-slate-900">Tratamientos realizados hoy</p>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
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
                {todayTreatments.map((treatment, index) => (
                  <tr
                    key={treatment.id}
                    className="border-b border-slate-50 transition hover:bg-slate-50/50 animate-fade-in"
                    style={{ animationDelay: `${420 + index * 40}ms` }}
                  >
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums text-slate-600">
                      {formatTime(treatment.performedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900">
                      {treatment.patientName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-600">{treatment.treatmentName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl border border-slate-100 bg-white shadow-sm animate-card-in"
        style={{ animationDelay: "420ms" }}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <p className="text-sm font-semibold text-slate-900">Agenda de hoy</p>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {kpis.todayAppointments} citas programadas
          </span>
        </div>
        {recentAppointments.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">No hay citas programadas para hoy</p>
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
                {recentAppointments.map((appointment, index) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-slate-50 transition hover:bg-slate-50/50 animate-fade-in"
                    style={{ animationDelay: `${480 + index * 40}ms` }}
                  >
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums text-slate-600">
                      {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900">
                      {appointment.patientName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-600">{appointment.doctorName}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-600">{appointment.boxName}</td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[appointment.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {STATUS_LABELS[appointment.status] ?? appointment.status}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-3 text-xs font-medium ${PAYMENT_COLORS[appointment.paymentStatus] ?? "text-slate-500"}`}
                    >
                      {appointment.paymentStatus === "PAID"
                        ? "Pagado"
                        : appointment.paymentStatus === "PENDING"
                          ? "Pendiente"
                          : "Exento"}
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
