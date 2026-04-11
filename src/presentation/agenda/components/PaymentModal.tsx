"use client";

import { NOTE_MAX_LENGTH, PAYMENT_STATUS_LABELS } from "../agenda.constants";
import type {
  AgendaAppointment,
  AgendaTreatment,
  PaymentFormState,
  PaymentStatus,
} from "../agenda.types";
import { formatCurrency, formatFullDateLabel, formatTimeLabel, getPatientFullName } from "../agenda.utils";

type Props = {
  appointment: AgendaAppointment;
  form: PaymentFormState;
  treatments: AgendaTreatment[];
  saving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onTreatmentChange: (treatmentId: string) => void;
  onFieldChange: (field: keyof PaymentFormState, value: string) => void;
  onSubmit: () => void;
};

export default function PaymentModal({
  appointment,
  form,
  treatments,
  saving,
  errorMessage,
  onClose,
  onTreatmentChange,
  onFieldChange,
  onSubmit,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cobro asociado a cita</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {getPatientFullName(appointment.patient)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {formatFullDateLabel(appointment.startAt)} · {formatTimeLabel(new Date(appointment.startAt))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Tratamiento</label>
            <select
              value={form.treatmentId}
              onChange={(event) => onTreatmentChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecciona un tratamiento</option>
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name} · {formatCurrency(treatment.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Estado de pago</label>
              <select
                value={form.status}
                onChange={(event) => onFieldChange("status", event.target.value as PaymentStatus)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Monto</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => onFieldChange("amount", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Notas</label>
            <textarea
              value={form.notes}
              onChange={(event) => onFieldChange("notes", event.target.value.slice(0, NOTE_MAX_LENGTH))}
              className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errorMessage && (
            <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/20 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
              disabled={saving || treatments.length === 0}
            >
              {saving ? "Guardando..." : "Registrar cobro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
