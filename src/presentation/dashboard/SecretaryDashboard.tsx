"use client";

import { useMemo, useState } from "react";

import {
  useSecretaryDashboardViewModel,
  type ArrivalInput,
  type QuickPaymentInput,
} from "./SecretaryDashboardViewModel";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_COLORS,
  formatCurrency,
  formatPaymentLabel,
  formatTime,
  StatCard,
  SkeletonCard,
  SkeletonBlock,
} from "./shared";
import type {
  SecretaryAppointment,
  WaitingRoomStatus,
} from "@/domain/dashboard/entities/Dashboard";
import type { Treatment } from "@/domain/treatments/entities/Treatment";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock,
  Pill,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";

type WaitingRoomEntry = {
  appointment: SecretaryAppointment;
  status: WaitingRoomStatus;
  initials: string;
};

const WAITING_ROOM_STATUS_LABELS: Record<WaitingRoomStatus, string> = {
  waiting: "En espera",
  ready: "En sala",
  delayed: "Con demora",
};

const WAITING_ROOM_STATUS_STYLES: Record<WaitingRoomStatus, string> = {
  waiting: "border-slate-200 bg-slate-50 text-slate-600",
  ready: "border-[#19b3bc]/20 bg-[#e8f8f9] text-[#0f8f98]",
  delayed: "border-amber-200 bg-amber-50 text-amber-700",
};

const CARD_BUTTON_STYLES: Record<WaitingRoomStatus, string> = {
  waiting: "bg-[#19b3bc] text-white hover:bg-[#159ea7]",
  ready: "bg-[#e8f8f9] text-[#0f8f98]",
  delayed: "bg-amber-100 text-amber-800 hover:bg-amber-200",
};

/** Citas que siguen vivas hoy: canceladas, completadas y ausentes salen de la sala. */
const WAITING_ROOM_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED"];

const NOTE_MAX_LENGTH = 250;

const DELAY_STEP_MINUTES = 15;
const DELAY_MAX_MINUTES = 240;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** El estado de sala se deriva de lo persistido en la cita, no de estado local. */
function resolveWaitingRoomStatus(appointment: SecretaryAppointment): WaitingRoomStatus {
  if (appointment.arrivedAt) return "ready";
  if (appointment.delayMinutes) return "delayed";
  return "waiting";
}

function buildWaitingRoomEntries(appointments: SecretaryAppointment[]): WaitingRoomEntry[] {
  return appointments
    .filter((appointment) => WAITING_ROOM_APPOINTMENT_STATUSES.includes(appointment.status))
    .map((appointment) => ({
      appointment,
      status: resolveWaitingRoomStatus(appointment),
      initials: getInitials(appointment.patientName),
    }));
}

function getWaitingTimeLabel(entry: WaitingRoomEntry) {
  if (entry.status === "ready") {
    return entry.appointment.arrivedAt
      ? `Desde ${formatTime(entry.appointment.arrivedAt)}`
      : "Listo";
  }
  if (entry.status === "delayed") return `${entry.appointment.delayMinutes} min`;
  return "Pendiente";
}

type QuickPaymentModalProps = {
  entry: WaitingRoomEntry;
  treatments: Treatment[];
  saving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: QuickPaymentInput) => void;
};

/**
 * Cobro rapido. Escribe por el mismo endpoint que la caja del dia de /agenda
 * (PATCH /api/appointments/:id), asi que el movimiento aparece alli sin duplicarse.
 */
function QuickPaymentModal({
  entry,
  treatments,
  saving,
  errorMessage,
  onClose,
  onSubmit,
}: QuickPaymentModalProps) {
  const existing = entry.appointment.payment;
  const [treatmentId, setTreatmentId] = useState(existing?.treatmentId ?? "");
  const [status, setStatus] = useState<QuickPaymentInput["status"]>(existing?.status ?? "PAID");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // Al elegir tratamiento se sugiere su precio, igual que en la agenda.
  const handleTreatmentChange = (nextId: string) => {
    setTreatmentId(nextId);
    const treatment = treatments.find((item) => item.id === nextId);
    if (treatment && !amount) setAmount(String(treatment.price));
  };

  const parsedAmount = Number(amount);
  const canSubmit =
    Boolean(treatmentId) && Number.isFinite(parsedAmount) && parsedAmount > 0 && !saving;
  const willAutoComplete =
    status === "PAID" && new Date(entry.appointment.startAt).getTime() <= Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="animate-modal-in w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Cobrar cita</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {entry.appointment.patientName} · {formatTime(entry.appointment.startAt)} ·{" "}
              {entry.appointment.boxName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Tratamiento</label>
            <select
              value={treatmentId}
              onChange={(event) => handleTreatmentChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#19b3bc]"
            >
              <option value="">Selecciona un tratamiento</option>
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name} — {formatCurrency(treatment.price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Monto</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 outline-none transition focus:border-[#19b3bc]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Estado</label>
            <div className="mt-1 flex gap-2">
              {(["PAID", "PENDING", "WAIVED"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setStatus(option)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    status === option
                      ? "bg-[#19b3bc] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {formatPaymentLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Notas</label>
            <textarea
              value={notes}
              maxLength={NOTE_MAX_LENGTH}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#19b3bc]"
            />
          </div>

          {willAutoComplete ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              Al cobrar como pagada, la cita quedará marcada como completada.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                treatmentId,
                status,
                amount: parsedAmount,
                notes: notes.trim() ? notes.trim() : null,
              })
            }
            className="rounded-lg bg-[#19b3bc] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#159ea7] disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar cobro"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecretaryDashboard() {
  const { state, actions } = useSecretaryDashboardViewModel();
  const { data, loading, error, treatments, savingAppointmentId, actionError } = state;
  const { fetchData, registerPayment, updateArrival, clearActionError } = actions;

  const [payingEntryId, setPayingEntryId] = useState<string | null>(null);

  const recentAppointments = useMemo(() => data?.recentAppointments ?? [], [data]);
  const waitingRoomEntries = useMemo(
    () => buildWaitingRoomEntries(recentAppointments),
    [recentAppointments]
  );

  const waitingRoomSummary = useMemo(() => {
    const ready = waitingRoomEntries.filter((entry) => entry.status === "ready").length;
    const delayed = waitingRoomEntries.filter((entry) => entry.status === "delayed").length;
    const waiting = waitingRoomEntries.filter((entry) => entry.status === "waiting").length;
    const notified = waitingRoomEntries.filter(
      (entry) => entry.appointment.arrivalNotifiedAt
    ).length;

    return { ready, delayed, waiting, notified };
  }, [waitingRoomEntries]);

  /** Total cobrado hoy desde esta pantalla y desde la caja del dia: misma fuente. */
  const collectedToday = useMemo(
    () =>
      recentAppointments.reduce(
        (sum, appointment) =>
          appointment.payment?.status === "PAID" ? sum + appointment.payment.amount : sum,
        0
      ),
    [recentAppointments]
  );

  const payingEntry = useMemo(
    () => waitingRoomEntries.find((entry) => entry.appointment.id === payingEntryId) ?? null,
    [payingEntryId, waitingRoomEntries]
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} h="h-24" />
          ))}
        </div>
        <SkeletonBlock h="h-28" />
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <SkeletonBlock h="h-[420px]" />
          <SkeletonBlock h="h-[420px]" />
        </div>
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
        <button onClick={fetchData} className="text-sm text-[#19b3bc] underline hover:text-[#159ea7]">
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

  const applyArrival = (appointmentId: string, input: ArrivalInput) => {
    void updateArrival(appointmentId, input);
  };

  // "Llegó" marca la llegada y avisa al profesional en el mismo gesto: es lo que
  // recepción necesita en la práctica, y evita un segundo clic para notificar.
  const markPatientAsArrived = (appointmentId: string) =>
    applyArrival(appointmentId, { status: "ARRIVED", notify: true });

  const markPatientAsDelayed = (entry: WaitingRoomEntry) => {
    const current = entry.appointment.delayMinutes ?? 0;
    const nextDelay = Math.min(current + DELAY_STEP_MINUTES, DELAY_MAX_MINUTES);
    applyArrival(entry.appointment.id, {
      status: "DELAYED",
      delayMinutes: nextDelay,
      notify: true,
    });
  };

  const notifyDoctor = (entry: WaitingRoomEntry) =>
    applyArrival(entry.appointment.id, {
      status: entry.status === "ready" ? "ARRIVED" : entry.status === "delayed" ? "DELAYED" : "WAITING",
      delayMinutes: entry.status === "delayed" ? entry.appointment.delayMinutes ?? undefined : undefined,
      notify: true,
    });

  const submitPayment = async (appointmentId: string, input: QuickPaymentInput) => {
    const ok = await registerPayment(appointmentId, input);
    if (ok) setPayingEntryId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 capitalize">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900">Recepción</h1>
          <p className="mt-1 text-xs text-slate-400">
            {clinic.name}
            {clinic.city ? ` · ${clinic.city}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#19b3bc]/15 bg-[#19b3bc]/10 px-3 py-1.5 text-xs font-medium text-[#0f8f98]">
            Panel Recepción
          </span>
        </div>
      </div>

      {/* Resumen de sala */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "En sala", value: waitingRoomSummary.ready, icon: CheckCircle2, color: "text-[#0f8f98]" },
          { label: "En espera", value: waitingRoomSummary.waiting, icon: Clock, color: "text-cyan-700" },
          { label: "Con demora", value: waitingRoomSummary.delayed, icon: CircleAlert, color: "text-amber-600" },
          { label: "Avisos enviados", value: waitingRoomSummary.notified, icon: BellRing, color: "text-[#19b3bc]" },
        ].map((item, i) => (
          <div
            key={item.label}
            className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm animate-card-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <item.icon size={16} className={`${item.color} mb-2`} />
            <p className="text-lg font-bold text-slate-900">{item.value}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Caja del dia: mismos datos que /agenda, no una copia paralela */}
      <div
        className="rounded-2xl bg-gradient-to-br from-[#19b3bc] to-[#0f8f98] p-6 text-white shadow-sm animate-card-in lg:flex lg:items-center lg:justify-between lg:gap-6"
        style={{ animationDelay: "160ms" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Wallet size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Caja del día</p>
            <p className="text-xs text-white/70">
              Los cobros que registres aquí aparecen en la caja de la agenda.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-0">
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              Cobrado hoy
            </p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(collectedToday)}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              Avisos enviados
            </p>
            <p className="text-lg font-bold tabular-nums">{waitingRoomSummary.notified}</p>
          </div>
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Ver caja completa
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {actionError ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-600">{actionError}</p>
          <button
            onClick={clearActionError}
            className="rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-600"
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-card-in"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f8f9] text-[#0f8f98]">
                <CalendarDays size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Citas de hoy</h2>
                <p className="text-xs text-slate-500">{waitingRoomEntries.length} pacientes en agenda</p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {waitingRoomEntries.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No hay pacientes en la sala de espera
              </p>
            ) : (
              waitingRoomEntries.map((entry) => {
                const { appointment } = entry;
                const busy = savingAppointmentId === appointment.id;

                return (
                  <div key={appointment.id} className="rounded-xl border border-slate-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {appointment.patientName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {appointment.doctorName} · {appointment.boxName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            PAYMENT_COLORS[appointment.paymentStatus] ?? "text-slate-500"
                          } bg-slate-50`}
                        >
                          {formatPaymentLabel(appointment.paymentStatus)}
                        </span>
                        <button
                          onClick={() => markPatientAsArrived(appointment.id)}
                          disabled={entry.status === "ready" || busy}
                          className={`min-w-[74px] rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default disabled:opacity-100 ${CARD_BUTTON_STYLES[entry.status]}`}
                        >
                          {entry.status === "ready" ? "En sala" : busy ? "..." : "Llegó"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${WAITING_ROOM_STATUS_STYLES[entry.status]}`}
                      >
                        {WAITING_ROOM_STATUS_LABELS[entry.status]}
                      </span>
                      <button
                        onClick={() => setPayingEntryId(appointment.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0f8f98] transition hover:border-[#19b3bc] hover:bg-[#e8f8f9] disabled:opacity-50"
                      >
                        <Wallet size={12} />
                        {appointment.payment ? "Editar cobro" : "Cobrar"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-card-in"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f8f9] text-[#0f8f98]">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Sala de espera</h2>
                <p className="text-xs text-slate-500">{waitingRoomSummary.waiting} pacientes pendientes de ingreso</p>
              </div>
            </div>
          </div>

          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-3 font-medium">Paciente</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Espera</th>
                  <th className="px-3 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {waitingRoomEntries.map((entry) => {
                  const { appointment } = entry;
                  const busy = savingAppointmentId === appointment.id;

                  return (
                  <tr key={appointment.id} className="border-b border-slate-100 text-xs last:border-b-0">
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f8f9] text-xs font-semibold text-[#0f8f98]">
                          {entry.initials}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{appointment.patientName}</p>
                          <p className="text-[11px] text-slate-500">
                            {appointment.doctorName} · {formatTime(appointment.startAt)}
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
                      {appointment.arrivalNotifiedAt ? (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Avisado {formatTime(appointment.arrivalNotifiedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-slate-700">{getWaitingTimeLabel(entry)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setPayingEntryId(appointment.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0f8f98] transition hover:border-[#19b3bc] hover:bg-[#e8f8f9] disabled:opacity-50"
                        >
                          <Wallet size={12} />
                          {appointment.payment ? "Editar cobro" : "Cobrar"}
                        </button>
                        <button
                          onClick={() => notifyDoctor(entry)}
                          disabled={busy}
                          className="rounded-lg bg-[#19b3bc] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#159ea7] disabled:opacity-50"
                        >
                          {appointment.arrivalNotifiedAt ? "Reenviar" : "Notificar"}
                        </button>
                        <button
                          onClick={() => markPatientAsDelayed(entry)}
                          disabled={busy}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                        >
                          Demorar
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={kpis.todayAppointments}
          icon={CalendarDays}
          iconColor="bg-cyan-50 text-cyan-700"
          delay={0}
        />
        <StatCard
          label="Completadas"
          value={kpis.todayCompleted}
          icon={CheckCircle2}
          iconColor="bg-[#e8f8f9] text-[#0f8f98]"
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
          iconColor="bg-teal-50 text-teal-700"
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
                          className="h-1.5 rounded-full bg-gradient-to-r from-[#19b3bc] to-cyan-300 transition-all duration-500"
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
                <span className="h-2.5 w-2.5 rounded-full bg-[#0f8f98]" />
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
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
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

      {payingEntry ? (
        <QuickPaymentModal
          entry={payingEntry}
          treatments={treatments}
          saving={savingAppointmentId === payingEntry.appointment.id}
          errorMessage={actionError}
          onClose={() => {
            setPayingEntryId(null);
            clearActionError();
          }}
          onSubmit={(input) => void submitPayment(payingEntry.appointment.id, input)}
        />
      ) : null}
    </div>
  );
}
