"use client";

import { NOTE_MAX_LENGTH, SLOT_MINUTES } from "../agenda.constants";
import type {
  AgendaBox,
  AgendaDoctor,
  AgendaPatient,
  AppointmentFormState,
} from "../agenda.types";

type Props = {
  editingId: string | null;
  form: AppointmentFormState;
  patients: AgendaPatient[];
  doctors: AgendaDoctor[];
  boxes: AgendaBox[];
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (field: keyof AppointmentFormState, value: string) => void;
  onPatientSelect: (patientId: string) => void;
  onOpenCancelConfirm: () => void;
};

export default function AppointmentFormModal({
  editingId,
  form,
  patients,
  doctors,
  boxes,
  errorMessage,
  onClose,
  onSubmit,
  onFieldChange,
  onPatientSelect,
  onOpenCancelConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {editingId ? "Editar cita" : "Nueva cita"}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {editingId ? "Actualizar detalles de la cita" : "Agendar cita medica"}
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

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Nombre"
              value={form.patientFirstName}
              onChange={(event) => onFieldChange("patientFirstName", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="text"
              placeholder="Apellido"
              value={form.patientLastName}
              onChange={(event) => onFieldChange("patientLastName", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="email"
              placeholder="Correo electronico"
              value={form.patientEmail}
              onChange={(event) => onFieldChange("patientEmail", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="tel"
              placeholder="Numero de telefono"
              value={form.patientPhone}
              onChange={(event) => onFieldChange("patientPhone", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.doctorId}
              onChange={(event) => onFieldChange("doctorId", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Profesional</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.profile?.firstName} {doctor.profile?.lastName}
                </option>
              ))}
            </select>
            <select
              value={form.patientId}
              onChange={(event) => onPatientSelect(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.boxId}
              onChange={(event) => onFieldChange("boxId", event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Box</option>
              {boxes.map((box) => (
                <option key={box.id} value={box.id}>
                  {box.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-3 md:col-span-1">
              <input
                type="date"
                value={form.date}
                onChange={(event) => onFieldChange("date", event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 md:col-span-1"
              />
              <input
                type="time"
                step={SLOT_MINUTES * 60}
                value={form.start}
                onChange={(event) => onFieldChange("start", event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 md:col-span-1"
              />
              <input
                type="time"
                step={SLOT_MINUTES * 60}
                value={form.end}
                onChange={(event) => onFieldChange("end", event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 md:col-span-1"
              />
            </div>
          </div>
          <div className="relative">
            <textarea
              placeholder="Descripcion"
              value={form.notes}
              maxLength={NOTE_MAX_LENGTH}
              onChange={(event) => onFieldChange("notes", event.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 pr-16 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-300">
              {form.notes.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>

          {errorMessage && (
            <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={editingId ? onOpenCancelConfirm : onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {editingId ? "Cancelar cita" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
