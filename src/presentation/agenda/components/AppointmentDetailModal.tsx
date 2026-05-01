"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NOTE_MAX_LENGTH, PAYMENT_STATUS_LABELS } from "../agenda.constants";
import { APPOINTMENT_STATUSES, STATUS_LABELS, type AppointmentStatus } from "../statusColors";
import type {
  AgendaAppointment,
  AgendaTreatment,
  PaymentFormState,
  PaymentStatus,
} from "../agenda.types";
import { formatCurrency, formatTimeLabel } from "../agenda.utils";

type Props = {
  appointment: AgendaAppointment;
  canChangeStatus: boolean;
  canEdit: boolean;
  canManageDailyCash: boolean;
  isDoctor: boolean;
  selectedStatus: AppointmentStatus | "";
  statusUpdating: boolean;
  paymentForm: PaymentFormState;
  treatments: AgendaTreatment[];
  paymentError: string | null;
  errorMessage: string | null;
  hasDetailChanges: boolean;
  detailApplyLoading: boolean;
  onClose: () => void;
  onSelectStatus: (status: AppointmentStatus | "") => void;
  onPaymentTreatmentChange: (treatmentId: string) => void;
  onPaymentFieldChange: (field: keyof PaymentFormState, value: string) => void;
  onApplyChanges: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function AppointmentDetailModal({
  appointment,
  canChangeStatus,
  canEdit,
  canManageDailyCash,
  isDoctor,
  selectedStatus,
  statusUpdating,
  paymentForm,
  treatments,
  paymentError,
  errorMessage,
  hasDetailChanges,
  detailApplyLoading,
  onClose,
  onSelectStatus,
  onPaymentTreatmentChange,
  onPaymentFieldChange,
  onApplyChanges,
  onEdit,
  onDelete,
}: Props) {
  const dropdownTriggerClassName =
    "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:border-[#19b3bc]/40 focus:outline-none";
  const dropdownPanelClassName =
    "animate-fade-in absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#19b3bc]/20 bg-white shadow-xl shadow-[#19b3bc]/10";
  const dropdownItemClassName =
    "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-[#19b3bc]/5";
  const fieldClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all duration-200 focus:border-[#19b3bc] focus:outline-none focus:ring-2 focus:ring-[#19b3bc]/15";
  const [openDropdown, setOpenDropdown] = useState<"appointmentStatus" | "treatment" | null>(null);
  const appointmentStatusRef = useRef<HTMLDivElement | null>(null);
  const treatmentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        appointmentStatusRef.current?.contains(target) ||
        treatmentRef.current?.contains(target)
      ) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectedTreatmentLabel = useMemo(() => {
    const treatment = treatments.find((item) => item.id === paymentForm.treatmentId);
    if (treatment) {
      return `${treatment.name} · ${formatCurrency(treatment.price)}`;
    }

    if (appointment.paymentEntry?.treatment.id === paymentForm.treatmentId) {
      return `${appointment.paymentEntry.treatment.name} · ${formatCurrency(appointment.paymentEntry.treatment.price)}`;
    }

    return "Tratamiento";
  }, [appointment.paymentEntry, paymentForm.treatmentId, treatments]);

  const selectedPaymentStatusLabel = PAYMENT_STATUS_LABELS[paymentForm.status] ?? "Estado de pago";
  const selectedAppointmentStatusLabel =
    STATUS_LABELS[(selectedStatus || appointment.status) as AppointmentStatus] ?? "Estado";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3 text-sm">
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
            <div className="rounded-xl bg-slate-50/60 px-3.5 py-2.5">
              <span className="text-slate-400">Descripcion</span>
              <p className="mt-1 font-medium text-slate-700">
                {appointment.notes?.trim() || "Sin descripcion"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#19b3bc]/12 bg-[#19b3bc]/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f8f98]">
                  Estado de la cita
                </p>
                {statusUpdating ? (
                  <span className="text-xs font-medium text-[#0f8f98]">Actualizando...</span>
                ) : null}
              </div>

              {canChangeStatus ? (
                <div ref={appointmentStatusRef} className="relative mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown((current) =>
                        current === "appointmentStatus" ? null : "appointmentStatus",
                      )
                    }
                    className={`${dropdownTriggerClassName} ${
                      openDropdown === "appointmentStatus" ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15" : ""
                    }`}
                  >
                    <span className="truncate text-slate-700">{selectedAppointmentStatusLabel}</span>
                    <span
                      className={`text-[#19b3bc] transition-transform duration-200 ${
                        openDropdown === "appointmentStatus" ? "rotate-180" : ""
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </button>

                  {openDropdown === "appointmentStatus" && (
                    <div className={dropdownPanelClassName}>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {APPOINTMENT_STATUSES.map((status) => {
                          const isSelected = (selectedStatus || appointment.status) === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                onSelectStatus(status);
                                setOpenDropdown(null);
                              }}
                              className={`${dropdownItemClassName} ${
                                isSelected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                              }`}
                            >
                              <span>{STATUS_LABELS[status]}</span>
                              {isSelected ? (
                                <span className="text-[#19b3bc]">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700">
                  {STATUS_LABELS[appointment.status]}
                </p>
              )}
            </div>

            {canManageDailyCash && (
              <div className="rounded-2xl border border-[#19b3bc]/12 bg-[#19b3bc]/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f8f98]">
                  Cobro de la cita
                </p>

                <div className="mt-3 grid gap-3">
                  <div ref={treatmentRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((current) => (current === "treatment" ? null : "treatment"))}
                      className={`${dropdownTriggerClassName} ${
                        openDropdown === "treatment" ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15" : ""
                      }`}
                    >
                      <span className={`truncate ${paymentForm.treatmentId ? "text-slate-700" : "text-slate-400"}`}>
                        {selectedTreatmentLabel}
                      </span>
                      <span
                        className={`text-[#19b3bc] transition-transform duration-200 ${
                          openDropdown === "treatment" ? "rotate-180" : ""
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </button>

                    {openDropdown === "treatment" && (
                      <div className={dropdownPanelClassName}>
                        <div className="max-h-64 overflow-y-auto py-1">
                          {treatments.map((treatment) => {
                            const isSelected = paymentForm.treatmentId === treatment.id;
                            return (
                              <button
                                key={treatment.id}
                                type="button"
                                onClick={() => {
                                  onPaymentTreatmentChange(treatment.id);
                                  setOpenDropdown(null);
                                }}
                                className={`${dropdownItemClassName} ${
                                  isSelected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                                }`}
                              >
                                <span className="truncate">
                                  {treatment.name} · {formatCurrency(treatment.price)}
                                </span>
                                {isSelected ? (
                                  <span className="text-[#19b3bc]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-slate-700">Pagado</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {paymentForm.status === "PAID"
                            ? "Este cobro se suma a la caja del dia."
                            : paymentForm.status === "WAIVED"
                              ? "Actualmente esta marcado como exento y no suma a la caja del dia."
                              : "Desmarcado queda pendiente y no suma a la caja del dia."}
                        </p>
                        <p className="mt-2 text-xs font-medium text-[#0f8f98]">
                          Estado actual: {selectedPaymentStatusLabel}
                        </p>
                      </div>
                      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                        <input
                          type="checkbox"
                          checked={paymentForm.status === "PAID"}
                          onChange={(event) =>
                            onPaymentFieldChange(
                              "status",
                              (event.target.checked ? "PAID" : "PENDING") as PaymentStatus,
                            )
                          }
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#19b3bc]" />
                        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                      </span>
                    </label>

                    <div>
                      <input
                        type="number"
                        min="1"
                        value={paymentForm.amount}
                        onChange={(event) => onPaymentFieldChange("amount", event.target.value)}
                        placeholder="Monto"
                        className={fieldClassName}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={paymentForm.notes}
                      onChange={(event) => onPaymentFieldChange("notes", event.target.value.slice(0, NOTE_MAX_LENGTH))}
                      placeholder="Notas del cobro"
                      className={`${fieldClassName} min-h-[96px] pr-16`}
                    />
                    <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-300">
                      {paymentForm.notes.length}/{NOTE_MAX_LENGTH}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {errorMessage}
          </div>
        )}

        {paymentError && (
          <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {paymentError}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <a
              href={`/appointments/${appointment.id}`}
              className="rounded-full border border-blue-200 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              Iniciar Cita
            </a>
            {(isDoctor || canEdit) && (
              <a
                href={`/clinical-visits?appointmentId=${appointment.id}&patientId=${appointment.patient.id}`}
                className="rounded-full border border-emerald-200 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                Iniciar consulta
              </a>
            )}
          </div>
          <div className="flex gap-3">
            {canEdit && appointment.status === "CANCELLED" && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
              >
                Eliminar cita
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
            {(canChangeStatus || canManageDailyCash) && (
              <button
                type="button"
                onClick={onApplyChanges}
                disabled={detailApplyLoading || !hasDetailChanges}
                className="rounded-full bg-[#19b3bc] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#159ea7] hover:shadow-lg hover:shadow-[#19b3bc]/20 disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45 disabled:shadow-none"
              >
                {detailApplyLoading ? "Aplicando..." : "Aplicar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
