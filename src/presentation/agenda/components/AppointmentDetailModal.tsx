"use client";

import { STATUS_LABELS } from "../statusColors";
import type { AgendaAppointment } from "../agenda.types";
import { formatTimeLabel } from "../agenda.utils";

type Props = {
  appointment: AgendaAppointment;
  canChangeStatus: boolean;
  canEdit: boolean;
  canManageDailyCash: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onOpenPaymentModal: () => void;
  onOpenStatusModal: () => void;
  onEdit: () => void;
};

export default function AppointmentDetailModal({
  appointment,
  canChangeStatus,
  canEdit,
  canManageDailyCash,
  errorMessage,
  onClose,
  onOpenPaymentModal,
  onOpenStatusModal,
  onEdit,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Detalle actividad</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Profesional</span>
            <span className="ml-auto font-medium text-slate-700">
              {appointment.doctor.profile?.firstName} {appointment.doctor.profile?.lastName}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Box</span>
            <span className="ml-auto font-medium text-slate-700">{appointment.box.name}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Horario</span>
            <span className="ml-auto font-medium text-slate-700">
              {formatTimeLabel(new Date(appointment.startAt))} - {formatTimeLabel(new Date(appointment.endAt))}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Fecha</span>
            <span className="ml-auto font-medium text-slate-700">
              {new Date(appointment.startAt).toLocaleDateString("es-CL")}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Estado</span>
            <span className="ml-auto font-medium text-slate-700">
              {STATUS_LABELS[appointment.status]}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-slate-400">Descripcion</span>
            <p className="mt-1 font-medium text-slate-700">
              {appointment.notes?.trim() || "Sin descripcion"}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <a
            href={`/appointments/${appointment.id}`}
            className="rounded-full border border-blue-200 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            Ficha clinica
          </a>
          {(canChangeStatus || canEdit) && (
            <div className="flex gap-3">
              {canManageDailyCash && (
                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="rounded-full border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  Registrar cobro
                </button>
              )}
              {canChangeStatus && (
                <button
                  type="button"
                  onClick={onOpenStatusModal}
                  className="rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Estado de Cita
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
                >
                  Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
