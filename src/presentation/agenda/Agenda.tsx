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

export default function Agenda() {
  const { state, actions, derived } = useAgendaViewModel();

  if (state.roleLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]"
          aria-label="Cargando agenda"
        />
      </div>
    );
  }

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
          errorMessage={state.errorMessage}
          onClose={actions.closeOverlay}
          onSubmit={(event) => void actions.createOrUpdateAppointment(event)}
          onFieldChange={actions.handleAppointmentFormChange}
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
    </div>
  );
}
