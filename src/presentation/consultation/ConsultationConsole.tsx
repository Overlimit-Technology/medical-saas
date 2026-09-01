"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import { CONSULTATION_STAGES } from "./consultation.constants";
import { useConsultationViewModel } from "./ConsultationViewModel";
import ClosedSummary from "./components/ClosedSummary";
import ConsultationHeader from "./components/ConsultationHeader";
import ContextRail from "./components/ContextRail";
import StageAssessment from "./components/StageAssessment";
import StageClosure from "./components/StageClosure";
import StageDiagnosis from "./components/StageDiagnosis";
import StageIntake from "./components/StageIntake";
import StageRail from "./components/StageRail";
import StageRecords from "./components/StageRecords";
import StageVitals from "./components/StageVitals";
import StartGate from "./components/StartGate";

type Props = {
  appointmentId: string;
};

function ConsoleSkeleton() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="h-16 rounded-2xl bg-slate-100" />
      <div className="h-20 rounded-2xl bg-slate-100" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="h-40 rounded-2xl bg-slate-100" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-80 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Consola de consulta clinica. Une en un solo recorrido lo que antes estaba
 * partido entre el resumen de la cita y el formulario de "iniciar consulta":
 * el profesional entra, atiende por etapas y cierra dejando agendado el
 * control, creado el plan y registrado el cobro.
 */
export default function ConsultationConsole({ appointmentId }: Props) {
  const { state, actions } = useConsultationViewModel(appointmentId);
  // null = la etapa de fichas aun no se abrio en esta sesion; hasta entonces
  // manda el conteo que trajo el servidor, para no mostrar la etapa vacia
  // cuando la cita si tiene fichas.
  const [observedRecords, setObservedRecords] = useState<number | null>(null);

  const handleRecordsCount = useCallback((count: number) => setObservedRecords(count), []);

  if (state.loading) return <ConsoleSkeleton />;

  if (state.loadError || !state.bootstrap) {
    return (
      <div className="animate-rise-in mx-auto max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertCircle size={22} />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">No se pudo abrir la consulta</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {state.loadError ?? "La cita no esta disponible para tu usuario."}
        </p>
        <Link
          href="/agenda"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <ArrowLeft size={15} /> Volver a la agenda
        </Link>
      </div>
    );
  }

  const { bootstrap, closure } = state;

  if (state.closeResult) {
    return <ClosedSummary bootstrap={bootstrap} result={state.closeResult} />;
  }

  if (!state.isStarted) {
    return (
      <div className="py-4">
        {state.actionError && (
          <div className="animate-fade-in mx-auto mb-4 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.actionError}
          </div>
        )}
        <StartGate
          bootstrap={bootstrap}
          canWrite={state.canWrite}
          starting={state.starting}
          onStart={() => void actions.startConsultation()}
        />
      </div>
    );
  }

  const readOnly = !state.canWrite;
  const isFirstStage = state.stageIndex === 0;
  const isLastStage = state.stageIndex === CONSULTATION_STAGES.length - 1;
  const recordsCount =
    observedRecords ??
    bootstrap.history.records.filter((record) => record.belongsToThisAppointment).length;

  return (
    <div className="pb-8">
      <ConsultationHeader
        patient={bootstrap.patient}
        appointment={bootstrap.appointment}
        startedAt={state.visit?.startedAt ?? null}
        saveState={state.saveState}
        isClosed={state.isClosed}
      />

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
        <StageRail
          current={state.stage}
          currentIndex={state.stageIndex}
          draft={state.draft}
          recordsCount={recordsCount}
          disabled={false}
          onSelect={actions.goToStage}
        />
      </div>

      {state.actionError && (
        <div className="animate-fade-in mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="flex-1 text-sm text-rose-700">{state.actionError}</p>
          <button
            type="button"
            onClick={actions.dismissError}
            className="shrink-0 text-rose-400 transition-colors hover:text-rose-600"
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {readOnly && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Estas viendo la consulta en modo lectura. Solo el profesional que atiende puede editarla.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {state.stage === "intake" && (
            <StageIntake
              bootstrap={bootstrap}
              draft={state.draft}
              readOnly={readOnly}
              onSectionChange={actions.setSection}
            />
          )}

          {state.stage === "vitals" && (
            <StageVitals
              bootstrap={bootstrap}
              draft={state.draft}
              readOnly={readOnly}
              onVitalChange={actions.setVital}
              onCopyPrevious={actions.copyPreviousVitals}
            />
          )}

          {state.stage === "assessment" && (
            <StageAssessment
              bootstrap={bootstrap}
              draft={state.draft}
              readOnly={readOnly}
              onSectionChange={actions.setSection}
            />
          )}

          {state.stage === "records" && (
            <StageRecords
              appointmentId={appointmentId}
              patientId={bootstrap.patient.id}
              patientName={bootstrap.patient.fullName}
              doctorName={bootstrap.appointment.doctorName}
              onCountChange={handleRecordsCount}
            />
          )}

          {state.stage === "diagnosis" && (
            <StageDiagnosis
              draft={state.draft}
              readOnly={readOnly}
              onSectionChange={actions.setSection}
            />
          )}

          {state.stage === "closure" && closure && (
            <StageClosure
              bootstrap={bootstrap}
              draft={state.draft}
              closure={closure}
              recordsCount={recordsCount}
              readOnly={readOnly}
              closing={state.closing}
              onSectionChange={actions.setSection}
              onUpdate={actions.updateClosure}
              onTogglePlanTreatment={actions.togglePlanTreatment}
              onApplyPreset={actions.applyFollowUpPreset}
              onGoToStage={actions.goToStage}
              onClose={() => void actions.closeConsultation()}
            />
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={actions.goPrevious}
              disabled={isFirstStage}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:-translate-x-0.5 hover:border-slate-300 disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Anterior
            </button>

            <span className="text-xs tabular-nums text-slate-400">
              Etapa {state.stageIndex + 1} de {CONSULTATION_STAGES.length}
            </span>

            <button
              type="button"
              onClick={actions.goNext}
              disabled={isLastStage}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#19b3bc] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:bg-[#159ea7] hover:shadow-lg hover:shadow-[#19b3bc]/25 disabled:pointer-events-none disabled:bg-slate-200 disabled:shadow-none"
            >
              {state.saveState === "saving" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : null}
              Siguiente <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pb-4">
          <ContextRail bootstrap={bootstrap} />
        </div>
      </div>
    </div>
  );
}
