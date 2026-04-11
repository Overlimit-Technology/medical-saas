"use client";

import { APPOINTMENT_STATUSES, STATUS_LABELS, type AppointmentStatus } from "../statusColors";
import type { AgendaAppointment } from "../agenda.types";

type Props = {
  appointment: AgendaAppointment;
  selectedStatus: AppointmentStatus | "";
  statusUpdating: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSelectStatus: (status: AppointmentStatus | "") => void;
  onSubmit: () => void;
};

export default function AppointmentStatusModal({
  appointment,
  selectedStatus,
  statusUpdating,
  errorMessage,
  onClose,
  onSelectStatus,
  onSubmit,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <h3 className="text-lg font-semibold text-slate-900">Estado de Cita</h3>
        <p className="mt-2 text-sm text-slate-500">
          Estado actual: <span className="font-semibold text-slate-700">{STATUS_LABELS[appointment.status]}</span>.
        </p>

        <select
          value={selectedStatus}
          onChange={(event) => onSelectStatus(event.target.value as AppointmentStatus | "")}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Selecciona un estado</option>
          {APPOINTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        {errorMessage && (
          <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:shadow-none"
            disabled={statusUpdating || !selectedStatus || selectedStatus === appointment.status}
          >
            {statusUpdating ? "Actualizando..." : "Actualizar estado"}
          </button>
        </div>
      </div>
    </div>
  );
}
