"use client";

import { usePatientDetailViewModel } from "./PatientDetailViewModel";
import { formatRelativeDate } from "../PatientsViewModel";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="block text-[11px] text-slate-400">{label}</span>
      <span className="block text-sm font-medium text-slate-900">{value || "-"}</span>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 px-4 py-3">
      <label className="block text-[11px] text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300"
        placeholder="-"
      />
    </div>
  );
}

export default function PatientDetail() {
  const { state, actions } = usePatientDetailViewModel();
  const {
    patient,
    loading,
    isAdmin,
    canEdit,
    editing,
    saving,
    form,
    apiError,
    successMessage,
    age,
    fileNumber,
    filteredAppointments,
    availableYears,
    historyYear,
    deleteConfirmChecked,
    deleting,
    deleteError,
  } = state;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-slate-100" />
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-400">Paciente no encontrado.</p>
          <button
            onClick={actions.goBack}
            className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300"
          >
            Volver a pacientes
          </button>
        </div>
      </div>
    );
  }

  const Field = editing ? EditableField : ReadOnlyField;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navegación */}
      <div className="flex items-center gap-3">
        <button
          onClick={actions.goBack}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm text-slate-400">Pacientes</span>
        <span className="text-sm text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">
          {patient.firstName} {patient.lastName}
        </span>
      </div>

      {/* ── Detalles del paciente ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Detalles del paciente</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              N° Ficha: <span className="font-medium text-slate-700">{fileNumber}</span>
            </span>
            {canEdit && !editing && (
              <button
                onClick={actions.startEditing}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Editar
              </button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={actions.cancelEditing}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={actions.saveChanges}
                  disabled={saving}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:bg-slate-400"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            )}
          </div>
        </div>

        {apiError && (
          <div className="mt-3 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {apiError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Field
            label="Nombre"
            value={editing ? form.firstName : patient.firstName}
            onChange={(v) => actions.handleFieldChange("firstName", v)}
          />
          <Field
            label="Primer apellido"
            value={editing ? form.lastName : patient.lastName}
            onChange={(v) => actions.handleFieldChange("lastName", v)}
          />
          <Field
            label="Segundo apellido"
            value={editing ? form.secondLastName : patient.secondLastName ?? ""}
            onChange={(v) => actions.handleFieldChange("secondLastName", v)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label="Numero de contacto"
            value={editing ? form.phone : patient.phone ?? ""}
            onChange={(v) => actions.handleFieldChange("phone", v)}
          />
          <Field
            label="Run"
            value={editing ? form.run : patient.run}
            onChange={(v) => actions.handleFieldChange("run", v)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label="Sexo asignado al nacer"
            value={editing ? form.gender : patient.gender ?? ""}
            onChange={(v) => actions.handleFieldChange("gender", v)}
          />
          {editing ? (
            <EditableField
              label="Fecha de nacimiento"
              value={form.birthDate}
              onChange={(v) => actions.handleFieldChange("birthDate", v)}
              type="date"
            />
          ) : (
            <ReadOnlyField label="Edad" value={age !== null ? `${age}` : "-"} />
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label="Dirección"
            value={editing ? form.address : [patient.address, patient.city].filter(Boolean).join(", ") || ""}
            onChange={(v) => actions.handleFieldChange("address", v)}
          />
          <Field
            label="Correo electrónico"
            value={editing ? form.email : patient.email ?? ""}
            onChange={(v) => actions.handleFieldChange("email", v)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label="Contacto de emergencia"
            value={editing ? form.emergencyContactName : patient.emergencyContactName ?? ""}
            onChange={(v) => actions.handleFieldChange("emergencyContactName", v)}
          />
          <Field
            label="Teléfono de emergencia"
            value={editing ? form.emergencyContactPhone : patient.emergencyContactPhone ?? ""}
            onChange={(v) => actions.handleFieldChange("emergencyContactPhone", v)}
          />
        </div>
      </div>

      {/* ── Historial de consultas ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Historial de consultas</h2>
          <div className="flex items-center gap-1">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => actions.setHistoryYear(y)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  y === historyYear
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {y === new Date().getFullYear() ? "Este año" : y}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2.5 font-medium">Numero de cita</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Medico a cargo</th>
                <th className="px-3 py-2.5 font-medium">Epicrisis</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    Sin consultas en {historyYear}.
                  </td>
                </tr>
              )}
              {filteredAppointments.map((appt, idx) => {
                const doctorName = appt.doctor?.profile
                  ? `${appt.doctor.profile.firstName} ${appt.doctor.profile.lastName}`
                  : "-";
                const doctorInitial = appt.doctor?.profile?.firstName?.charAt(0)?.toUpperCase() ?? "?";
                return (
                  <tr
                    key={appt.id}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="animate-card-in border-b border-slate-50 last:border-b-0"
                  >
                    <td className="px-3 py-3 font-medium text-slate-700">
                      {appt.id.slice(-9).toUpperCase()}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          appt.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-600"
                            : appt.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-500"
                              : appt.status === "NO_SHOW"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-blue-50 text-blue-500"
                        }`}
                      >
                        {appt.status === "COMPLETED"
                          ? "Completada"
                          : appt.status === "CANCELLED"
                            ? "Cancelada"
                            : appt.status === "NO_SHOW"
                              ? "No asistió"
                              : appt.status === "CONFIRMED"
                                ? "Confirmada"
                                : "Agendada"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {formatRelativeDate(appt.startAt)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                          {doctorInitial}
                        </div>
                        <span className="text-slate-700">{doctorName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        disabled
                        className="flex items-center gap-1 text-xs text-slate-300 cursor-not-allowed"
                        title="Próximamente"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Eliminar paciente (solo admin) ── */}
      {isAdmin && (
        <div className="rounded-2xl border border-rose-100 bg-white px-6 pb-6 pt-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Eliminar paciente</h2>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-slate-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                Estas apunto de eliminar un paciente
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Para mayor seguridad, esto requiere que confirmes la eliminación
              </p>
            </div>
            <button
              onClick={actions.handleDelete}
              disabled={!deleteConfirmChecked || deleting}
              className="flex-shrink-0 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {deleting ? "Eliminando..." : "Eliminar paciente"}
            </button>
          </div>
          {deleteError && (
            <div className="mt-3 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {deleteError}
            </div>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={deleteConfirmChecked}
              onChange={(e) => actions.setDeleteConfirmChecked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            Confirmo quiero eliminarlo
          </label>
        </div>
      )}

      {/* Toast */}
      {successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
