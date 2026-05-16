"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientDetailViewModel } from "./PatientDetailViewModel";
import type { PatientTreatmentItem } from "./PatientDetailViewModel";
import { formatRelativeDate } from "../PatientsViewModel";
import { generatePatientPDF } from "./generatePatientPDF";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ImagingStudy = {
  id: string;
  studyName: string;
  studiedAt: string;
  doctorName: string;
  status: string;
  imageUrl: string | null;
  observation: string | null;
};

// ─── Modal visor de imagen ────────────────────────────────────────────────────

function ImageViewerModal({
  study,
  onClose,
}: {
  study: ImagingStudy;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl shadow-slate-900/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{study.studyName}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {new Date(study.studiedAt).toLocaleDateString("es-CL")} · {study.doctorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {study.imageUrl ? (
            <img
              src={study.imageUrl}
              alt={study.studyName}
              className="w-full rounded-xl border border-slate-200 object-contain"
              style={{ maxHeight: "420px" }}
            />
          ) : (
            <div
              className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200"
              style={{
                background:
                  "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.8) 0%, transparent 28%), linear-gradient(135deg,#1f2937,#6b7280)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              <p className="mt-3 text-sm font-medium text-white/70">Sin imagen adjunta</p>
              <p className="mt-1 text-xs text-white/40">El estudio fue registrado sin archivo de imagen</p>
            </div>
          )}

          {study.observation && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Observación</p>
              <p className="mt-1 text-sm text-slate-700">{study.observation}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                study.status === "completado"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {study.status === "completado" ? "Completado" : "Pendiente"}
            </span>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Historial de Imagenología ────────────────────────────────────────────────

function ImagingHistorialSection({ patientId }: { patientId: string }) {
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ImagingStudy | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/${patientId}/imaging`);
        const data = (await res.json().catch(() => null)) as {
          ok: boolean;
          items?: ImagingStudy[];
        } | null;
        if (res.ok && data?.ok) setStudies(data.items ?? []);
      } catch {
        setStudies([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [patientId]);

  return (
    <>
      {viewing && (
        <ImageViewerModal study={viewing} onClose={() => setViewing(null)} />
      )}

      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Historial de Imagenología</h2>
          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {studies.length} estudio{studies.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-50" />
            ))}
          </div>
        ) : studies.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-slate-300"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <p className="text-sm text-slate-400">Sin estudios de imagenología registrados</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5 font-medium">Estudio</th>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Profesional</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => (
                  <tr key={study.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-slate-700">{study.studyName}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {new Date(study.studiedAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{study.doctorName}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setViewing(study)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Tracker de tratamiento activo ────────────────────────────────────────────

function TreatmentTrackerSection({
  treatments,
  loading,
  patientId,
}: {
  treatments: PatientTreatmentItem[];
  loading: boolean;
  patientId: string;
}) {
  const router = useRouter();
  const activeTreatments = useMemo(
    () => treatments.filter((t) => t.status === "in_progress"),
    [treatments]
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Tratamiento Actual</h2>
        {!loading && activeTreatments.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
            {activeTreatments.length} activo{activeTreatments.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      ) : treatments.length === 0 ? (
        /* Sin tratamientos de ningún tipo */
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-slate-300"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
          <p className="text-sm font-medium text-slate-500">Sin tratamientos</p>
          <p className="mt-1 text-xs text-slate-400">Ni completados ni en proceso</p>
        </div>
      ) : activeTreatments.length === 0 ? (
        /* Tiene tratamientos pero todos están completados */
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-100 bg-emerald-50/30 py-10 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-emerald-300"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <p className="text-sm font-medium text-emerald-700">Sin tratamiento activo</p>
          <p className="mt-1 text-xs text-slate-400">
            {treatments.length} tratamiento{treatments.length !== 1 ? "s" : ""} completado{treatments.length !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        /* Tiene tratamientos activos */
        <>
          <p className="mt-1 text-sm text-slate-400">
            Haz clic en un tratamiento para ver el seguimiento completo con el profesional
          </p>
          <div className="mt-4 space-y-3">
            {activeTreatments.map((treatment) => {
              const total = treatment.totalPayments || 1;
              const paid = treatment.paidPayments;
              const pct = Math.round((paid / total) * 100);
              const phaseLabel =
                total > 1 ? `Fase ${paid + 1} de ${total}` : paid === 0 ? "En progreso" : "Completando";

              return (
                <button
                  key={treatment.id}
                  onClick={() => router.push(`/seguimiento?patientId=${patientId}`)}
                  className="group w-full rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-800">
                        {treatment.treatmentName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Iniciado el {new Date(treatment.performedAt).toLocaleDateString("es-CL")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {phaseLabel}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-blue-400 transition-colors"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>Progreso de pagos</span>
                      <span className="font-medium text-slate-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {paid} de {total} pago{total !== 1 ? "s" : ""} completado{total !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Campos del formulario ────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

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
    treatments,
    loadingTreatments,
  } = state;

  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    if (!patient) return;
    setGeneratingPDF(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/imaging`);
      const data = (await res.json().catch(() => null)) as {
        ok: boolean;
        items?: { id: string; studyName: string; studiedAt: string; doctorName: string; status: string; observation: string | null }[];
      } | null;
      const studies = data?.ok ? (data.items ?? []) : [];
      generatePatientPDF({
        patient,
        appointments: patient.appointments ?? [],
        treatments,
        studies,
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

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
          <Field label="Nombre" value={editing ? form.firstName : patient.firstName} onChange={(v) => actions.handleFieldChange("firstName", v)} />
          <Field label="Primer apellido" value={editing ? form.lastName : patient.lastName} onChange={(v) => actions.handleFieldChange("lastName", v)} />
          <Field label="Segundo apellido" value={editing ? form.secondLastName : patient.secondLastName ?? ""} onChange={(v) => actions.handleFieldChange("secondLastName", v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Numero de contacto" value={editing ? form.phone : patient.phone ?? ""} onChange={(v) => actions.handleFieldChange("phone", v)} />
          <Field label="Run" value={editing ? form.run : patient.run} onChange={(v) => actions.handleFieldChange("run", v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Sexo asignado al nacer" value={editing ? form.gender : patient.gender ?? ""} onChange={(v) => actions.handleFieldChange("gender", v)} />
          {editing ? (
            <EditableField label="Fecha de nacimiento" value={form.birthDate} onChange={(v) => actions.handleFieldChange("birthDate", v)} type="date" />
          ) : (
            <ReadOnlyField label="Edad" value={age !== null ? `${age}` : "-"} />
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Dirección" value={editing ? form.address : [patient.address, patient.city].filter(Boolean).join(", ") || ""} onChange={(v) => actions.handleFieldChange("address", v)} />
          <Field label="Correo electrónico" value={editing ? form.email : patient.email ?? ""} onChange={(v) => actions.handleFieldChange("email", v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Contacto de emergencia" value={editing ? form.emergencyContactName : patient.emergencyContactName ?? ""} onChange={(v) => actions.handleFieldChange("emergencyContactName", v)} />
          <Field label="Teléfono de emergencia" value={editing ? form.emergencyContactPhone : patient.emergencyContactPhone ?? ""} onChange={(v) => actions.handleFieldChange("emergencyContactPhone", v)} />
        </div>
      </div>

      {/* ── Historial de consultas + Vitácora ── */}
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
                <th className="px-3 py-2.5 font-medium">Resumen Clínico</th>
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
                        onClick={handleGeneratePDF}
                        disabled={generatingPDF}
                        className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-indigo-600 disabled:opacity-50"
                      >
                        {generatingPDF ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        )}
                        <span className="text-xs">{generatingPDF ? "Generando..." : "Descargar resumen"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── Historial de Imagenología ── */}
      <ImagingHistorialSection patientId={patient.id} />

      {/* ── Tratamiento Actual (clickeable → seguimiento) ── */}
      <TreatmentTrackerSection
        treatments={treatments}
        loading={loadingTreatments}
        patientId={patient.id}
      />

      {/* ── Eliminar paciente (solo admin) ── */}
      {isAdmin && (
        <div className="rounded-2xl border border-rose-100 bg-white px-6 pb-6 pt-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Eliminar paciente</h2>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-slate-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Estas apunto de eliminar un paciente</p>
              <p className="mt-0.5 text-xs text-slate-400">Para mayor seguridad, esto requiere que confirmes la eliminación</p>
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
