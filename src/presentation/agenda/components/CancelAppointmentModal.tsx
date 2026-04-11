"use client";

import { CANCEL_REASON_MAX_LENGTH } from "../agenda.constants";
import type { AgendaAppointment } from "../agenda.types";

type Props = {
  targetAppointment: AgendaAppointment | null;
  patientFallbackName: string;
  cancelReason: string;
  cancelling: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onCancelReasonChange: (value: string) => void;
  onSubmit: () => void;
};

export default function CancelAppointmentModal({
  targetAppointment,
  patientFallbackName,
  cancelReason,
  cancelling,
  errorMessage,
  onClose,
  onCancelReasonChange,
  onSubmit,
}: Props) {
  const patientName = targetAppointment
    ? `${targetAppointment.patient.firstName} ${targetAppointment.patient.lastName}`
    : patientFallbackName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <h3 className="text-lg font-semibold text-slate-900">Cancelar cita</h3>
        <p className="mt-2 text-sm text-slate-500">
          Esta accion cancelara la cita de {patientName} y notificara a los responsables correspondientes.
        </p>
        <div className="relative mt-4">
          <textarea
            value={cancelReason}
            onChange={(event) => onCancelReasonChange(event.target.value)}
            maxLength={CANCEL_REASON_MAX_LENGTH}
            placeholder="Motivo de cancelacion"
            className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 pr-16 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-300">
            {cancelReason.length}/{CANCEL_REASON_MAX_LENGTH}
          </span>
        </div>
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
            className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20 disabled:cursor-not-allowed disabled:bg-rose-300 disabled:shadow-none"
            disabled={cancelling || cancelReason.trim().length === 0}
          >
            {cancelling ? "Cancelando..." : "Confirmar cancelacion"}
          </button>
        </div>
      </div>
    </div>
  );
}
