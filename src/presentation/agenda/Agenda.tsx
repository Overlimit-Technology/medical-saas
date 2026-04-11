"use client";

import { useAgendaViewModel } from "./AgendaViewModel";
import StatusColorsModal from "./StatusColorsModal";
import AppointmentDetailModal from "./components/AppointmentDetailModal";
import AppointmentFormModal from "./components/AppointmentFormModal";
import AppointmentStatusModal from "./components/AppointmentStatusModal";
import AgendaGrid from "./components/AgendaGrid";
import AgendaHeader from "./components/AgendaHeader";
import CancelAppointmentModal from "./components/CancelAppointmentModal";
import DailyCashPanel from "./components/DailyCashPanel";
import InfoBanner from "./components/InfoBanner";
import PaymentModal from "./components/PaymentModal";

export default function Agenda() {
  const { state, actions, derived } = useAgendaViewModel();

  if (state.roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">
        Cargando permisos...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <InfoBanner />

      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <AgendaHeader
          activeView={state.activeView}
          isDoctor={derived.isDoctor}
            canManageDailyCash={derived.canManageDailyCash}
            canManageStatusColors={state.role === "ADMIN"}
            weekLabel={derived.weekLabel}
            dailyCashLoading={state.dailyCashLoading}
          onSetActiveView={actions.setActiveView}
          onShowColorSettings={actions.openStatusColors}
          onGoToToday={actions.goToToday}
          onGoToPreviousWeek={actions.goToPreviousWeek}
          onGoToNextWeek={actions.goToNextWeek}
          onReloadDailyCash={() => void actions.reloadDailyCash()}
        />

        {state.activeView === "agenda" ? (
          <AgendaGrid
            weekStart={state.weekStart}
            days={derived.days}
            slots={derived.slots}
            now={state.now}
            todayIndex={derived.todayIndex}
            isCurrentWeek={derived.isCurrentWeek}
            isWithinHours={derived.isWithinHours}
            nowSlot={derived.nowSlot}
            selection={state.selection}
            appointments={state.appointments}
            canEdit={derived.canEdit}
            draggingId={state.draggingId}
            resolvedColors={derived.resolvedColors}
            isSlotSelectionUnavailable={derived.isSlotSelectionUnavailable}
            canDropAppointmentAt={derived.canDropAppointmentAt}
            slotToDate={derived.slotToDate}
            onPointerDown={actions.handlePointerDown}
            onPointerEnter={actions.handlePointerEnter}
            onMoveAppointment={(appointmentId, dayIndex, slot) => void actions.moveAppointment(appointmentId, dayIndex, slot)}
            onAppointmentClick={actions.handleAppointmentClick}
            onAppointmentDragStart={actions.handleAppointmentDragStart}
            onAppointmentDragEnd={actions.handleAppointmentDragEnd}
          />
        ) : (
          <DailyCashPanel
            summary={state.dailyCashSummary}
            items={state.dailyCashItems}
            loading={state.dailyCashLoading}
            onBackToAgenda={() => actions.setActiveView("agenda")}
          />
        )}
      </div>

      {state.isModalOpen && (
        <AppointmentFormModal
          editingId={state.editingId}
          form={state.form}
          patients={state.patients}
          doctors={state.doctors}
          boxes={state.boxes}
          errorMessage={state.errorMessage}
          onClose={actions.closeOverlay}
          onSubmit={(event) => void actions.createOrUpdateAppointment(event)}
          onFieldChange={actions.handleAppointmentFormChange}
          onPatientSelect={actions.handlePatientSelection}
          onOpenCancelConfirm={actions.openCancelFromEditing}
        />
      )}

      {state.detailAppointment && (
        <AppointmentDetailModal
          appointment={state.detailAppointment}
          canChangeStatus={derived.canChangeStatus}
          canEdit={derived.canEdit}
          canManageDailyCash={derived.canManageDailyCash}
          errorMessage={state.errorMessage}
          onClose={actions.closeOverlay}
          onOpenPaymentModal={() => actions.openPaymentModal(state.detailAppointment!)}
          onOpenStatusModal={actions.openStatusModal}
          onEdit={actions.openEditFromDetail}
        />
      )}

      {state.statusModalOpen && state.detailAppointment && (
        <AppointmentStatusModal
          appointment={state.detailAppointment}
          selectedStatus={state.selectedStatus}
          statusUpdating={state.statusUpdating}
          errorMessage={state.errorMessage}
          onClose={actions.closeStatusModal}
          onSelectStatus={actions.setSelectedStatus}
          onSubmit={() => void actions.handleStatusUpdate()}
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

      {state.paymentModalOpen && state.paymentAppointment && (
        <PaymentModal
          appointment={state.paymentAppointment}
          form={state.paymentForm}
          treatments={state.treatments}
          saving={state.paymentSaving}
          errorMessage={state.paymentError}
          onClose={actions.closePaymentModal}
          onTreatmentChange={actions.handlePaymentTreatmentChange}
          onFieldChange={actions.handlePaymentFieldChange}
          onSubmit={() => void actions.handleRegisterPayment()}
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
