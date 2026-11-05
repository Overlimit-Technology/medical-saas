"use client";

import { useAgendaViewModel } from "./AgendaViewModel";
import StatusColorsModal from "./StatusColorsModal";
import AppointmentDetailModal from "./components/AppointmentDetailModal";
import AppointmentFormModal from "./components/AppointmentFormModal";
import AgendaGrid from "./components/AgendaGrid";
import AgendaHeader from "./components/AgendaHeader";
import CancelAppointmentModal from "./components/CancelAppointmentModal";
import DailyCashPanel from "./components/DailyCashPanel";
import InfoBanner from "./components/InfoBanner";
import { Skel, SkeletonStats } from "@/presentation/ui/zs";

/** Esqueleto de la agenda: la cabecera con sus cifras y el calendario con dias y citas. */
const SKEL_EVENTS: Array<[number, number, number]> = [
  [0, 18, 16], [0, 44, 14], [1, 26, 18], [2, 12, 14], [2, 52, 16], [3, 34, 20], [4, 8, 14], [4, 40, 14], [4, 62, 12],
];
function AgendaSkeleton() {
  return (
    <div className="zs-skel-wrap flex flex-col gap-6" role="status" aria-busy="true">
      <span className="sr-only">Cargando agenda</span>
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Skel className="h-11 w-11 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skel className="h-4 w-56" />
            <Skel className="h-3 w-36" />
          </div>
        </div>
        <SkeletonStats />
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Skel className="h-6 w-32" />
          <div className="flex gap-2">
            <Skel className="h-10 w-44 rounded-full" />
            <Skel className="h-10 w-16 rounded-full" />
            <Skel className="h-10 w-48 rounded-full" />
          </div>
        </div>
        <Skel className="mb-5 h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-2">
          <span />
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="flex flex-col items-center gap-1.5 pb-2">
              <Skel className="h-2.5 w-6" />
              <Skel className="h-4 w-4 rounded-full" />
            </div>
          ))}
          <div className="flex flex-col gap-[52px] pt-1">
            {Array.from({ length: 6 }, (_, h) => (
              <Skel key={h} className="h-2.5 w-9" />
            ))}
          </div>
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="relative h-[380px] rounded-lg bg-slate-50/60">
              {SKEL_EVENTS.filter(([day]) => day === d).map(([, top, h], i) => (
                <Skel key={i} className="absolute inset-x-1 rounded-md" style={{ top: `${top}%`, height: `${h}%`, animationDelay: `${(d + i) * 60}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Agenda() {
  const { state, actions, derived } = useAgendaViewModel();

  if (state.roleLoading) return <AgendaSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <InfoBanner />

      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <AgendaHeader
          activeView={state.activeView}
          agendaMode={state.agendaMode}
          doctorViewMode={state.doctorViewMode}
          selectedDoctorId={state.selectedDoctorId}
          doctors={state.doctors}
          isDoctor={derived.isDoctor}
          canManageDailyCash={derived.canManageDailyCash}
          canManageStatusColors={state.role === "ADMIN"}
          periodLabel={derived.periodLabel}
          dailyCashLoading={state.dailyCashLoading}
          onSetActiveView={actions.setActiveView}
          onSetAgendaMode={actions.setAgendaMode}
          onSetDoctorViewMode={actions.setDoctorViewMode}
          onSetSelectedDoctorId={actions.setSelectedDoctorId}
          onShowColorSettings={actions.openStatusColors}
          onGoToToday={actions.goToToday}
          onGoToPreviousPeriod={actions.goToPreviousPeriod}
          onGoToNextPeriod={actions.goToNextPeriod}
          onReloadDailyCash={() => void actions.reloadDailyCash()}
        />

        {state.activeView === "agenda" ? (
          <div className="-mx-6 overflow-x-auto px-6 pb-1">
            <AgendaGrid
              gridKey={`${state.agendaMode}-${state.doctorViewMode}-${state.selectedDoctorId}-${state.calendarDate.toISOString()}`}
              columns={derived.agendaColumns}
              slots={derived.slots}
              now={state.now}
              currentTimeColumnIndex={derived.currentTimeColumnIndex}
              isCurrentRange={derived.isCurrentRange}
              isWithinHours={derived.isWithinHours}
              nowSlot={derived.nowSlot}
              showCurrentTimeAcrossAllColumns={derived.showCurrentTimeAcrossAllColumns}
              selection={state.selection}
              appointments={derived.filteredAppointments}
              canSelectSlots={derived.canEdit}
              canDragAppointments={derived.canEdit && state.agendaMode !== "boxDay"}
              canResizeAppointments={derived.canEdit}
              draggingId={state.draggingId}
              resolvedColors={derived.resolvedColors}
              getAppointmentPlacement={derived.getAppointmentPlacement}
              isSlotSelectionUnavailable={derived.isSlotSelectionUnavailable}
              canDropAppointmentAt={derived.canDropAppointmentAt}
              canResizeAppointmentAt={derived.canResizeAppointmentAt}
              slotToDate={derived.slotToDate}
              onPointerDown={actions.handlePointerDown}
              onPointerEnter={actions.handlePointerEnter}
              onMoveAppointment={(appointmentId, columnIndex, slot) =>
                void actions.moveAppointment(appointmentId, columnIndex, slot)
              }
              onResizeAppointment={(appointmentId, columnIndex, startSlot, endSlot) =>
                void actions.resizeAppointment(appointmentId, columnIndex, startSlot, endSlot)
              }
              onAppointmentClick={actions.handleAppointmentClick}
              onAppointmentDragStart={actions.handleAppointmentDragStart}
              onAppointmentDragEnd={actions.handleAppointmentDragEnd}
            />
          </div>
        ) : (
          <DailyCashPanel
            summary={state.dailyCashSummary}
            items={state.dailyCashItems}
            loading={state.dailyCashLoading}
            onBackToAgenda={() => actions.setActiveView("agenda")}
            onCreateMovement={actions.createCashMovement}
          />
        )}
      </div>

      {state.isModalOpen && (
        <AppointmentFormModal
          editingId={state.editingId}
          form={state.form}
          patients={state.patients}
          patientSearchLoading={state.patientSearchLoading}
          isRegisteringNewPatient={state.isRegisteringNewPatient}
          doctors={state.doctors}
          boxes={state.boxes}
          treatments={state.treatments}
          continuousPlanForm={state.continuousPlanForm}
          errorMessage={state.errorMessage}
          onClose={actions.closeOverlay}
          onSubmit={(event) => void actions.createOrUpdateAppointment(event)}
          onFieldChange={actions.handleAppointmentFormChange}
          onContinuousPlanFieldChange={actions.handleContinuousPlanFieldChange}
          onContinuousPlanEnabledChange={actions.setContinuousPlanEnabled}
          onContinuousPlanTreatmentToggle={actions.toggleContinuousPlanTreatment}
          onPatientRunChange={actions.handlePatientRunChange}
          onPatientSelect={actions.handlePatientSelection}
          onStartRegisterNewPatient={actions.handleStartRegisterNewPatient}
          onOpenCancelConfirm={actions.openCancelFromEditing}
        />
      )}

      {state.detailAppointment && (
        <AppointmentDetailModal
          appointment={state.detailAppointment}
          canChangeStatus={derived.canChangeStatus}
          canEdit={derived.canEdit}
          canManageDailyCash={derived.canManageDailyCash}
          isDoctor={derived.isDoctor}
          selectedStatus={state.selectedStatus}
          statusUpdating={state.statusUpdating}
          paymentForm={state.paymentForm}
          treatments={state.treatments}
          paymentError={state.paymentError}
          errorMessage={state.errorMessage}
          hasDetailChanges={derived.hasDetailChanges}
          detailApplyLoading={derived.detailApplyLoading}
          onClose={actions.closeOverlay}
          onSelectStatus={actions.setSelectedStatus}
          onPaymentTreatmentChange={actions.handlePaymentTreatmentChange}
          onPaymentFieldChange={actions.handlePaymentFieldChange}
          onApplyChanges={() => void actions.applyDetailChanges()}
          onEdit={actions.openEditFromDetail}
          onDelete={() => void actions.handleDeleteAppointment()}
        />
      )}

      {state.cancelConfirm && (
        <CancelAppointmentModal
          targetAppointment={state.cancelTargetAppointment}
          patientFallbackName={`${state.form.patientFirstName} ${state.form.patientLastName}`.trim()}
          cancelReason={state.cancelReason}
          cancelling={state.cancelling}
          errorMessage={state.errorMessage}
          onClose={actions.closeCancelConfirm}
          onCancelReasonChange={actions.handleCancelReasonChange}
          onSubmit={() => void actions.handleCancelAppointment()}
        />
      )}

      {state.showColorSettings && (
        <StatusColorsModal
          currentOverrides={state.statusColorOverrides}
          saving={state.statusColorSaving}
          resetting={state.statusColorResetting}
          error={state.statusColorError}
          onSave={(newOverrides) => actions.saveStatusColors(newOverrides)}
          onReset={() => actions.resetStatusColors()}
          onClose={actions.closeStatusColors}
        />
      )}

      {state.paymentSuccess && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.paymentSuccess}
        </div>
      )}

      {state.appointmentSuccess && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.appointmentSuccess}
        </div>
      )}
    </div>
  );
}
