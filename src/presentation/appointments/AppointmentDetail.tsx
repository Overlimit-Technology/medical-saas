"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppointmentDetailViewModel } from "@/presentation/appointments/AppointmentDetailViewModel";
import { useClinicalRecordsViewModel } from "@/presentation/clinical-records/ClinicalRecordsViewModel";
import ClinicalRecordsList from "@/presentation/clinical-records/ClinicalRecordsList";
import ClinicalRecordForm from "@/presentation/clinical-records/ClinicalRecordForm";
import TemplateSelector from "@/presentation/clinical-records/TemplateSelector";

function ClinicalRecordsSection({
  appointmentId,
  patientId,
  patientName,
  doctorName,
}: {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
}) {
  const { state, actions } = useClinicalRecordsViewModel(patientId, appointmentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Fichas clínicas</h2>
      </div>

      {state.loading && <p className="text-sm text-slate-400">Cargando fichas...</p>}

      {!state.loading && !state.isFormOpen && (
        <>
          <TemplateSelector
            templates={state.templates}
            onSelect={actions.openCreateForm}
          />
          <ClinicalRecordsList
            records={state.records}
            patientName={patientName}
            clinicLogo={state.clinicLogo}
            onEdit={actions.openEditForm}
          />
        </>
      )}

      {state.isFormOpen && state.selectedTemplate && (
        <ClinicalRecordForm
          templateName={state.selectedTemplate.name}
          fields={state.selectedTemplate.fields}
          values={state.values}
          saving={state.saving}
          apiError={state.apiError}
          isEdit={Boolean(state.editingRecord)}
          patientName={patientName}
          doctorName={doctorName}
          clinicLogo={state.clinicLogo}
          includeLogo={state.selectedTemplate.includeLogo !== false}
          onFieldChange={actions.setFieldValue}
          onSubmit={actions.handleSubmit}
          onCancel={actions.closeForm}
        />
      )}

      {state.successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}
    </div>
  );
}

export default function AppointmentDetail() {
  const params = useParams();
  const id = params?.id as string;
  const { state: { appointment, loading } } = useAppointmentDetailViewModel(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle cita</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {appointment
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : "Cargando"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/agenda"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Volver
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-slate-400">Cargando...</p>}
        {!loading && !appointment && <p className="text-sm text-slate-400">No encontrado</p>}
        {appointment && (
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Doctor:</span>{" "}
              {appointment.doctor.profile?.firstName} {appointment.doctor.profile?.lastName}
            </p>
            <p>
              <span className="font-medium text-slate-900">Box:</span> {appointment.box.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Inicio:</span>{" "}
              {new Date(appointment.startAt).toLocaleString("es-CL")}
            </p>
            <p>
              <span className="font-medium text-slate-900">Fin:</span>{" "}
              {new Date(appointment.endAt).toLocaleString("es-CL")}
            </p>
            <p>
              <span className="font-medium text-slate-900">Estado:</span> {appointment.status}
            </p>
          </div>
        )}
      </div>

      {/* Clinical Records Section */}
      {appointment && (
        <ClinicalRecordsSection
          appointmentId={appointment.id}
          patientId={appointment.patientId}
          patientName={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
          doctorName={appointment.doctor.profile ? `${appointment.doctor.profile.firstName} ${appointment.doctor.profile.lastName}` : "Doctor"}
        />
      )}
    </div>
  );
}
