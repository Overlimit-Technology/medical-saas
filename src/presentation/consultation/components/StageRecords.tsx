"use client";

import { useEffect } from "react";
import { FilePlus2, Loader2 } from "lucide-react";
import ClinicalRecordForm from "@/presentation/clinical-records/ClinicalRecordForm";
import ClinicalRecordsList from "@/presentation/clinical-records/ClinicalRecordsList";
import { useClinicalRecordsViewModel } from "@/presentation/clinical-records/ClinicalRecordsViewModel";
import { CONSULTATION_STAGES } from "../consultation.constants";
import StagePanel from "./StagePanel";

type Props = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  /** Sube el conteo para que la barra de etapas sepa si esta cubierta. */
  onCountChange: (count: number) => void;
};

const stage = CONSULTATION_STAGES[3];

/**
 * Fichas por plantilla de esta cita. Reutiliza el flujo que ya existia en el
 * detalle de la cita, ahora dentro del recorrido de la consulta.
 */
export default function StageRecords({
  appointmentId,
  patientId,
  patientName,
  doctorName,
  onCountChange,
}: Props) {
  const { state, actions } = useClinicalRecordsViewModel(patientId, appointmentId);

  useEffect(() => {
    onCountChange(state.records.length);
  }, [state.records.length, onCountChange]);

  return (
    <StagePanel
      stage={stage}
      aside={
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
          {state.records.length} en esta cita
        </span>
      }
    >
      {state.loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Cargando plantillas...
        </div>
      ) : state.isFormOpen && state.selectedTemplate ? (
        <div className="animate-stage-in">
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
            doctorSignatureUrl={state.doctorSignatureUrl}
            onFieldChange={actions.setFieldValue}
            onSubmit={actions.handleSubmit}
            onCancel={actions.closeForm}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Agregar ficha
            </p>
            {state.templates.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                Esta clinica aun no tiene plantillas de ficha. Creala en Plantillas de formulario.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {state.templates.map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => actions.openCreateForm(template.id)}
                    className="animate-rise-in inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:-translate-y-px hover:border-[#19b3bc]/50 hover:text-[#0f8f98] hover:shadow-sm"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <FilePlus2 size={14} />
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Fichas de esta cita
            </p>
            <ClinicalRecordsList
              records={state.records}
              patientName={patientName}
              clinicLogo={state.clinicLogo}
              onEdit={actions.openEditForm}
            />
          </div>
        </div>
      )}

      {state.successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}
    </StagePanel>
  );
}
