"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentsRepositoryHttp } from "@/data/appointments/AppointmentsRepository";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { BoxesRepositoryHttp } from "@/data/boxes/BoxesRepository";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import { CrmRepositoryHttp } from "@/data/crm/CrmRepository";
import { PatientsRepositoryHttp } from "@/data/patients/PatientsRepository";
import { UsersRepositoryHttp } from "@/data/users/UsersRepository";
import { GetAppointmentsUseCase } from "@/domain/appointments/usecases/GetAppointmentsUseCase";
import {
  CancelAppointmentUseCase,
  SaveAppointmentUseCase,
  UpdateAppointmentScheduleUseCase,
  UpdateAppointmentStatusUseCase,
} from "@/domain/appointments/usecases/ManageAppointmentsUseCases";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import { GetBoxesUseCase } from "@/domain/boxes/usecases/BoxesUseCases";
import {
  GetStatusColorsUseCase,
  ResetStatusColorsUseCase,
  SaveStatusColorsUseCase,
} from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";
import { GetCrmTreatmentsUseCase, GetDailyCashUseCase, SavePaymentHistoryUseCase } from "@/domain/crm/usecases/CrmUseCases";
import { GetPatientsUseCase } from "@/domain/patients/usecases/PatientsUseCases";
import { GetUsersUseCase } from "@/domain/users/usecases/UserUseCases";
import {
  CANCEL_REASON_MAX_LENGTH,
  NOTE_MAX_LENGTH,
} from "./agenda.constants";
import type {
  AgendaAppointment,
  AgendaBox,
  AgendaDailyCashItem,
  AgendaDailyCashSummary,
  AgendaDoctor,
  AgendaPatient,
  AgendaSelection,
  AgendaTreatment,
  AgendaView,
  AppointmentFormState,
  PaymentFormState,
  StatusOption,
} from "./agenda.types";
import {
  buildSlots,
  buildWeekDays,
  buildWeekLabel,
  createEmptyAppointmentForm,
  formatDateValue,
  formatTimeValue,
  hasAppointmentOverlap,
  isVisibleAgendaStatus,
  slotToDate,
  startOfWeek,
  toSlotIndex,
} from "./agenda.utils";
import { resolveStatusColors, type AppointmentStatus, type StatusColorMap } from "./statusColors";

type AppointmentFormField = keyof AppointmentFormState;
type PaymentFormField = keyof PaymentFormState;

export function useAgendaViewModel() {
  const {
    getCurrentSessionUseCase,
    getAppointmentsUseCase,
    saveAppointmentUseCase,
    cancelAppointmentUseCase,
    updateAppointmentStatusUseCase,
    updateAppointmentScheduleUseCase,
    getPatientsUseCase,
    getUsersUseCase,
    getBoxesUseCase,
    getCrmTreatmentsUseCase,
    getDailyCashUseCase,
    savePaymentHistoryUseCase,
    getStatusColorsUseCase,
    saveStatusColorsUseCase,
    resetStatusColorsUseCase,
  } = useMemo(() => {
    const authRepo = new AuthRepositoryHttp();
    const appointmentsRepo = new AppointmentsRepositoryHttp();
    const patientsRepo = new PatientsRepositoryHttp();
    const usersRepo = new UsersRepositoryHttp();
    const boxesRepo = new BoxesRepositoryHttp();
    const crmRepo = new CrmRepositoryHttp();
    const clinicSettingsRepo = new ClinicSettingsRepositoryHttp();

    return {
      getCurrentSessionUseCase: new GetCurrentSessionUseCase(authRepo),
      getAppointmentsUseCase: new GetAppointmentsUseCase(appointmentsRepo),
      saveAppointmentUseCase: new SaveAppointmentUseCase(appointmentsRepo),
      cancelAppointmentUseCase: new CancelAppointmentUseCase(appointmentsRepo),
      updateAppointmentStatusUseCase: new UpdateAppointmentStatusUseCase(appointmentsRepo),
      updateAppointmentScheduleUseCase: new UpdateAppointmentScheduleUseCase(appointmentsRepo),
      getPatientsUseCase: new GetPatientsUseCase(patientsRepo),
      getUsersUseCase: new GetUsersUseCase(usersRepo),
      getBoxesUseCase: new GetBoxesUseCase(boxesRepo),
      getCrmTreatmentsUseCase: new GetCrmTreatmentsUseCase(crmRepo),
      getDailyCashUseCase: new GetDailyCashUseCase(crmRepo),
      savePaymentHistoryUseCase: new SavePaymentHistoryUseCase(crmRepo),
      getStatusColorsUseCase: new GetStatusColorsUseCase(clinicSettingsRepo),
      saveStatusColorsUseCase: new SaveStatusColorsUseCase(clinicSettingsRepo),
      resetStatusColorsUseCase: new ResetStatusColorsUseCase(clinicSettingsRepo),
    };
  }, []);

  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [patients, setPatients] = useState<AgendaPatient[]>([]);
  const [doctors, setDoctors] = useState<AgendaDoctor[]>([]);
  const [boxes, setBoxes] = useState<AgendaBox[]>([]);
  const [treatments, setTreatments] = useState<AgendaTreatment[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activeView, setActiveView] = useState<AgendaView>("agenda");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<AgendaSelection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<AgendaAppointment | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTargetAppointment, setCancelTargetAppointment] = useState<AgendaAppointment | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [statusColorOverrides, setStatusColorOverrides] = useState<StatusColorMap | null>(null);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [statusColorSaving, setStatusColorSaving] = useState(false);
  const [statusColorResetting, setStatusColorResetting] = useState(false);
  const [statusColorError, setStatusColorError] = useState<string | null>(null);
  const [dailyCashLoading, setDailyCashLoading] = useState(false);
  const [dailyCashSummary, setDailyCashSummary] = useState<AgendaDailyCashSummary>(null);
  const [dailyCashItems, setDailyCashItems] = useState<AgendaDailyCashItem[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentAppointment, setPaymentAppointment] = useState<AgendaAppointment | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    treatmentId: "",
    status: "PAID",
    amount: "",
    notes: "",
  });
  const [form, setForm] = useState<AppointmentFormState>(() => createEmptyAppointmentForm());

  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const slots = useMemo(() => buildSlots(), []);
  const resolvedColors = useMemo(() => resolveStatusColors(statusColorOverrides), [statusColorOverrides]);
  const isDoctor = role === "DOCTOR";
  const canEdit = role === "ADMIN" || role === "SECRETARY";
  const canChangeStatus = role === "ADMIN" || role === "SECRETARY" || role === "DOCTOR";
  const canManageDailyCash = role === "SECRETARY" || role === "ADMIN";

  const loadAgenda = useCallback(async () => {
    const from = new Date(weekStart);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);

    try {
      const items = await getAppointmentsUseCase.execute({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setAppointments(items.filter((item) => isVisibleAgendaStatus(item.status as AppointmentStatus)));
    } catch {
      setAppointments([]);
    }
  }, [getAppointmentsUseCase, weekStart]);

  const loadLookups = useCallback(async () => {
    try {
      const [patientsData, usersData, boxesData] = await Promise.all([
        getPatientsUseCase.execute({ pageSize: 200 }),
        getUsersUseCase.execute(),
        getBoxesUseCase.execute(),
      ]);

      setPatients(
        patientsData.items.map((patient) => ({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email ?? null,
          phone: patient.phone ?? null,
        }))
      );

      setDoctors(
        usersData
          .filter((user) => user.role === "DOCTOR")
          .map((user) => ({ id: user.id, profile: user.profile ?? null }))
      );

      setBoxes(boxesData.map((box) => ({ id: box.id, name: box.name })));
    } catch {
      setPatients([]);
      setDoctors([]);
      setBoxes([]);
    }
  }, [getBoxesUseCase, getPatientsUseCase, getUsersUseCase]);

  const loadStatusColors = useCallback(async () => {
    try {
      const colors = await getStatusColorsUseCase.execute();
      setStatusColorOverrides((colors as StatusColorMap | null) ?? null);
    } catch {
      setStatusColorOverrides(null);
    }
  }, [getStatusColorsUseCase]);

  const loadTreatments = useCallback(async () => {
    if (!canManageDailyCash) {
      setTreatments([]);
      return;
    }

    try {
      setTreatments(await getCrmTreatmentsUseCase.execute());
      return;
    } catch {
      setTreatments([]);
    }
  }, [canManageDailyCash, getCrmTreatmentsUseCase]);

  const loadDailyCash = useCallback(async () => {
    if (!canManageDailyCash) {
      setDailyCashSummary(null);
      setDailyCashItems([]);
      return;
    }

    setDailyCashLoading(true);

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    try {
      const data = await getDailyCashUseCase.execute({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setDailyCashSummary(data.summary ?? null);
      setDailyCashItems(data.items ?? []);
    } catch {
      setDailyCashSummary(null);
      setDailyCashItems([]);
    } finally {
      setDailyCashLoading(false);
    }
  }, [canManageDailyCash, getDailyCashUseCase]);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const session = await getCurrentSessionUseCase.execute();
        setRole(session.role);
      } catch {
        setRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    void loadRole();
  }, [getCurrentSessionUseCase]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    void loadLookups();
    void loadStatusColors();
  }, [loadLookups, loadStatusColors]);

  useEffect(() => {
    void loadTreatments();
  }, [loadTreatments]);

  useEffect(() => {
    if (activeView !== "dailyCash") return;
    void loadDailyCash();
  }, [activeView, loadDailyCash]);

  useEffect(() => {
    if (!canManageDailyCash && activeView === "dailyCash") {
      setActiveView("agenda");
    }
  }, [activeView, canManageDailyCash]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!paymentSuccess) return;
    const timeoutId = window.setTimeout(() => setPaymentSuccess(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [paymentSuccess]);

  useEffect(() => {
    if (!treatments.length) return;

    setPaymentForm((previous) => {
      const selectedTreatment = treatments.find((item) => item.id === previous.treatmentId) ?? treatments[0];
      if (!selectedTreatment) return previous;

      const nextAmount = previous.amount.trim() ? previous.amount : `${Math.round(selectedTreatment.price)}`;
      if (previous.treatmentId === selectedTreatment.id && previous.amount === nextAmount) {
        return previous;
      }

      return {
        ...previous,
        treatmentId: selectedTreatment.id,
        amount: nextAmount,
      };
    });
  }, [treatments]);

  const slotDate = useCallback(
    (dayIndex: number, slotIndex: number) => slotToDate(weekStart, dayIndex, slotIndex),
    [weekStart]
  );

  const isSlotSelectionUnavailable = useCallback((dayIndex: number, slot: number) => {
    void dayIndex;
    void slot;
    return false;
  }, []);

  const resetModalState = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setDetailAppointment(null);
    setErrorMessage(null);
    setSelection(null);
    setIsSelecting(false);
    setCancelConfirm(false);
    setCancelling(false);
    setCancelReason("");
    setCancelTargetAppointment(null);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setStatusUpdating(false);
    setPaymentModalOpen(false);
    setPaymentSaving(false);
    setPaymentError(null);
    setPaymentAppointment(null);
  }, []);

  const openModalForRange = useCallback(
    (dayIndex: number, startSlot: number, endSlot: number) => {
      if (!canEdit) return;

      const normalizedStart = Math.min(startSlot, endSlot);
      const normalizedEnd = Math.max(startSlot, endSlot) + 1;
      const startAt = slotDate(dayIndex, normalizedStart);
      const endAt = slotDate(dayIndex, normalizedEnd);

      setForm((previous) => ({
        ...previous,
        date: formatDateValue(startAt),
        start: formatTimeValue(startAt),
        end: formatTimeValue(endAt),
        notes: "",
      }));
      setEditingId(null);
      setSelection(null);
      setIsModalOpen(true);
      setErrorMessage(null);
      setCancelReason("");
    },
    [canEdit, slotDate]
  );

  const finalizeSelection = useCallback(() => {
    if (!isSelecting || !selection || !canEdit) return;
    setIsSelecting(false);
    openModalForRange(selection.dayIndex, selection.startSlot, selection.endSlot);
  }, [canEdit, isSelecting, openModalForRange, selection]);

  useEffect(() => {
    const handlePointerUp = () => finalizeSelection();
    const handlePointerCancel = () => {
      setIsSelecting(false);
      setSelection(null);
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [finalizeSelection]);

  const handlePointerDown = (dayIndex: number, slot: number, event?: React.PointerEvent) => {
    event?.preventDefault();
    if (!canEdit || isSlotSelectionUnavailable(dayIndex, slot)) return;

    setIsSelecting(true);
    setSelection({ dayIndex, startSlot: slot, endSlot: slot });
    setEditingId(null);
    setErrorMessage(null);
  };

  const handlePointerEnter = (dayIndex: number, slot: number) => {
    if (!isSelecting || !selection || dayIndex !== selection.dayIndex || isSlotSelectionUnavailable(dayIndex, slot)) return;

    setSelection((previous) => (previous ? { ...previous, endSlot: slot } : previous));
  };

  const handleAppointmentDragStart = (appointmentId: string) => {
    if (!canEdit) return;
    setIsSelecting(false);
    setSelection(null);
    setErrorMessage(null);
    setDraggingId(appointmentId);
  };

  const handleAppointmentDragEnd = () => {
    if (!canEdit) return;
    setDraggingId(null);
  };

  const canDropAppointmentAt = useCallback(
    (appointmentId: string, dayIndex: number, slot: number) => {
      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment) return false;

      const newStart = slotDate(dayIndex, slot);
      const duration = new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      return !hasAppointmentOverlap(appointments, {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        boxId: appointment.boxId,
        startAt: newStart,
        endAt: newEnd,
      });
    },
    [appointments, slotDate]
  );

  const moveAppointment = async (appointmentId: string, dayIndex: number, slot: number) => {
    if (!canEdit) return;

    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;

    const newStart = slotDate(dayIndex, slot);
    const duration = new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    const hasOverlap = hasAppointmentOverlap(appointments, {
      appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      boxId: appointment.boxId,
      startAt: newStart,
      endAt: newEnd,
    });

    if (hasOverlap) {
      setErrorMessage("Ya existe una cita que se superpone para ese doctor, box o paciente.");
      return;
    }

    try {
      const updatedAppointment = await updateAppointmentScheduleUseCase.execute(appointmentId, {
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      });
      setAppointments((previous) =>
        previous.map((item) => (item.id === updatedAppointment.id ? updatedAppointment : item))
      );
      setDetailAppointment((previous) =>
        previous?.id === updatedAppointment.id ? updatedAppointment : previous
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo reprogramar la cita.");
    }
  };

  const handleAppointmentClick = (item: AgendaAppointment) => {
    setDetailAppointment(item);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setErrorMessage(null);
  };

  const openEditModal = (item: AgendaAppointment) => {
    if (!canEdit) return;

    const startAt = new Date(item.startAt);
    const endAt = new Date(item.endAt);

    setEditingId(item.id);
    setForm({
      patientId: item.patientId,
      patientFirstName: item.patient.firstName,
      patientLastName: item.patient.lastName,
      patientEmail: item.patient.email ?? "",
      patientPhone: item.patient.phone ?? "",
      doctorId: item.doctorId,
      boxId: item.boxId,
      date: formatDateValue(startAt),
      start: formatTimeValue(startAt),
      end: formatTimeValue(endAt),
      notes: (item.notes ?? "").slice(0, NOTE_MAX_LENGTH),
    });
    setIsModalOpen(true);
    setErrorMessage(null);
    setCancelReason("");
  };

  const openEditFromDetail = () => {
    if (!detailAppointment) return;
    const item = detailAppointment;
    resetModalState();
    openEditModal(item);
  };

  const handleAppointmentFormChange = (field: AppointmentFormField, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: field === "notes" ? value.slice(0, NOTE_MAX_LENGTH) : value,
    }));
  };

  const handlePatientSelection = (patientId: string) => {
    const patient = patients.find((item) => item.id === patientId);
    setForm((previous) => ({
      ...previous,
      patientId,
      patientFirstName: patient?.firstName ?? "",
      patientLastName: patient?.lastName ?? "",
      patientEmail: patient?.email ?? "",
      patientPhone: patient?.phone ?? "",
    }));
  };

  const createOrUpdateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !form.date || !form.start || !form.end) return;

    const startAt = new Date(`${form.date}T${form.start}:00`);
    const endAt = new Date(`${form.date}T${form.end}:00`);

    if (startAt >= endAt) {
      setErrorMessage("La hora de termino debe ser posterior a la hora de inicio.");
      return;
    }

    if (!form.patientId) {
      setErrorMessage("Selecciona un paciente para agendar la cita.");
      return;
    }

    const cleanPatientFirstName = form.patientFirstName.trim();
    const cleanPatientLastName = form.patientLastName.trim();

    if (!cleanPatientFirstName || !cleanPatientLastName) {
      setErrorMessage("Completa nombre y apellido del paciente.");
      return;
    }

    if (!form.doctorId || !form.boxId) {
      setErrorMessage("Selecciona un profesional y un box disponible.");
      return;
    }

    const hasOverlap = hasAppointmentOverlap(appointments, {
      appointmentId: editingId,
      patientId: form.patientId,
      doctorId: form.doctorId,
      boxId: form.boxId,
      startAt,
      endAt,
    });

    if (hasOverlap) {
      setErrorMessage("Ya existe una cita que se superpone para ese doctor, box o paciente.");
      return;
    }

    const cleanNotes = form.notes.slice(0, NOTE_MAX_LENGTH).trim();
    const cleanPatientEmail = form.patientEmail.trim();
    const cleanPatientPhone = form.patientPhone.trim();

    const payload = {
      patientId: form.patientId,
      doctorId: form.doctorId,
      boxId: form.boxId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      notes: cleanNotes || null,
      ...(editingId
        ? {}
        : {
            patientFirstName: cleanPatientFirstName,
            patientLastName: cleanPatientLastName,
            patientEmail: cleanPatientEmail || null,
            patientPhone: cleanPatientPhone || null,
          }),
    };

    try {
      await saveAppointmentUseCase.execute(editingId, payload);
      await loadAgenda();
      resetModalState();
      setForm(createEmptyAppointmentForm());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la cita.");
    }
  };

  const openCancelFromEditing = () => {
    if (!editingId) {
      resetModalState();
      return;
    }

    const item = appointments.find((appointment) => appointment.id === editingId) ?? null;
    setCancelTargetAppointment(item);
    setCancelReason("");
    setErrorMessage(null);
    setCancelConfirm(true);
  };

  const openStatusModal = () => {
    if (!detailAppointment || !canChangeStatus) return;
    setSelectedStatus(detailAppointment.status);
    setStatusModalOpen(true);
    setErrorMessage(null);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setSelectedStatus("");
    setErrorMessage(null);
  };

  const openCancelFromStatus = () => {
    if (!detailAppointment || !canChangeStatus) return;
    setStatusModalOpen(false);
    setCancelReason("");
    setCancelTargetAppointment(detailAppointment);
    setCancelConfirm(true);
    setErrorMessage(null);
  };

  const closeCancelConfirm = () => {
    setCancelConfirm(false);
    setCancelReason("");
    setCancelTargetAppointment(null);
    setErrorMessage(null);
  };

  const handleCancelReasonChange = (value: string) => {
    setCancelReason(value.slice(0, CANCEL_REASON_MAX_LENGTH));
  };

  const handleCancelAppointment = async () => {
    if (!cancelTargetAppointment || !canChangeStatus) return;

    const cleanReason = cancelReason.slice(0, CANCEL_REASON_MAX_LENGTH).trim();
    if (!cleanReason) {
      setErrorMessage("Ingresa un motivo de cancelacion.");
      return;
    }

    setCancelling(true);
    setErrorMessage(null);

    try {
      await cancelAppointmentUseCase.execute(cancelTargetAppointment.id, {
        reason: cleanReason,
        cancelledBy: "STAFF",
      });
      await loadAgenda();
      resetModalState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cancelar la cita.");
      setCancelling(false);
      return;
    }

    setCancelling(false);
  };

  const openPaymentModal = (item: AgendaAppointment) => {
    const defaultTreatment = treatments[0];
    setPaymentAppointment(item);
    setPaymentError(null);
    setPaymentSuccess(null);
    setPaymentForm({
      treatmentId: defaultTreatment?.id ?? "",
      status: "PAID",
      amount: defaultTreatment ? `${Math.round(defaultTreatment.price)}` : "",
      notes: (item.notes ?? "").slice(0, NOTE_MAX_LENGTH),
    });
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentError(null);
    setPaymentAppointment(null);
  };

  const handlePaymentTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find((item) => item.id === treatmentId);
    setPaymentForm((previous) => ({
      ...previous,
      treatmentId,
      amount: treatment ? `${Math.round(treatment.price)}` : previous.amount,
    }));
  };

  const handlePaymentFieldChange = (field: PaymentFormField, value: string) => {
    setPaymentForm((previous) => ({
      ...previous,
      [field]: field === "notes" ? value.slice(0, NOTE_MAX_LENGTH) : value,
    }));
  };

  const handleRegisterPayment = async () => {
    if (!paymentAppointment || !canManageDailyCash) return;

    const amount = Number(paymentForm.amount);
    if (!paymentForm.treatmentId) {
      setPaymentError("Selecciona un tratamiento.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto valido.");
      return;
    }

    setPaymentSaving(true);
    setPaymentError(null);

    try {
      await savePaymentHistoryUseCase.execute({
        patientId: paymentAppointment.patientId,
        treatmentId: paymentForm.treatmentId,
        performedAt: paymentAppointment.startAt,
        status: paymentForm.status,
        amount,
        notes: paymentForm.notes.trim() || null,
      });
      setPaymentSaving(false);
      closePaymentModal();
      setPaymentSuccess("Cobro registrado correctamente.");
      await loadDailyCash();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "No se pudo registrar el cobro.");
      setPaymentSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!detailAppointment || !canChangeStatus) return;
    if (!selectedStatus) {
      setErrorMessage("Selecciona un estado.");
      return;
    }

    if (selectedStatus === detailAppointment.status) {
      setErrorMessage("Selecciona un estado distinto al actual.");
      return;
    }

    if (selectedStatus === "CANCELLED") {
      openCancelFromStatus();
      return;
    }

    setStatusUpdating(true);
    setErrorMessage(null);

    let nextAppointment: AgendaAppointment;
    try {
      nextAppointment = await updateAppointmentStatusUseCase.execute(detailAppointment.id, selectedStatus);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el estado de la cita."
      );
      setStatusUpdating(false);
      return;
    }

    if (!isVisibleAgendaStatus(nextAppointment.status as AppointmentStatus)) {
      setAppointments((previous) => previous.filter((item) => item.id !== detailAppointment.id));
      setStatusUpdating(false);
      resetModalState();
      return;
    }

    setAppointments((previous) =>
      previous.map((item) => (item.id === nextAppointment.id ? nextAppointment : item))
    );
    setDetailAppointment(nextAppointment);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setStatusUpdating(false);
  };

  const saveStatusColors = async (newOverrides: StatusColorMap) => {
    setStatusColorSaving(true);
    setStatusColorError(null);
    try {
      await saveStatusColorsUseCase.execute(newOverrides);
      setStatusColorOverrides(newOverrides);
      setShowColorSettings(false);
    } catch (error) {
      setStatusColorError(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setStatusColorSaving(false);
    }
  };

  const resetStatusColors = async () => {
    setStatusColorResetting(true);
    setStatusColorError(null);
    try {
      await resetStatusColorsUseCase.execute();
      setStatusColorOverrides(null);
      setShowColorSettings(false);
    } catch (error) {
      setStatusColorError(error instanceof Error ? error.message : "No se pudo restablecer.");
    } finally {
      setStatusColorResetting(false);
    }
  };

  const closeStatusColors = () => {
    setStatusColorError(null);
    setShowColorSettings(false);
  };

  const goToToday = () => setWeekStart(startOfWeek(new Date()));

  const goToPreviousWeek = () => {
    setWeekStart((previous) => {
      const nextDate = new Date(previous);
      nextDate.setDate(nextDate.getDate() - 7);
      return startOfWeek(nextDate);
    });
  };

  const goToNextWeek = () => {
    setWeekStart((previous) => {
      const nextDate = new Date(previous);
      nextDate.setDate(nextDate.getDate() + 7);
      return startOfWeek(nextDate);
    });
  };

  const todayIndex = days.findIndex((day) => day.toDateString() === now.toDateString());
  const isCurrentWeek = todayIndex >= 0 && todayIndex <= 6;
  const isWithinHours = now.getHours() >= 8 && now.getHours() < 20;
  const nowSlot = Math.max(0, Math.min(slots.length - 1, toSlotIndex(now)));
  const weekLabel = useMemo(() => buildWeekLabel(weekStart), [weekStart]);

  return {
    state: {
      role,
      roleLoading,
      appointments,
      patients,
      doctors,
      boxes,
      treatments,
      weekStart,
      activeView,
      isModalOpen,
      editingId,
      detailAppointment,
      draggingId,
      errorMessage,
      cancelConfirm,
      cancelling,
      cancelReason,
      cancelTargetAppointment,
      statusModalOpen,
      selectedStatus,
      statusUpdating,
      statusColorOverrides,
      showColorSettings,
      statusColorSaving,
      statusColorResetting,
      statusColorError,
      dailyCashLoading,
      dailyCashSummary,
      dailyCashItems,
      paymentModalOpen,
      paymentSaving,
      paymentError,
      paymentSuccess,
      paymentAppointment,
      paymentForm,
      form,
      selection,
      now,
    },
    actions: {
      setActiveView,
      goToToday,
      goToPreviousWeek,
      goToNextWeek,
      reloadDailyCash: loadDailyCash,
      openStatusColors: () => setShowColorSettings(true),
      closeStatusColors,
      saveStatusColors,
      resetStatusColors,
      closeOverlay: resetModalState,
      handlePointerDown,
      handlePointerEnter,
      moveAppointment,
      handleAppointmentDragStart,
      handleAppointmentDragEnd,
      handleAppointmentClick,
      openEditModal,
      openEditFromDetail,
      handleAppointmentFormChange,
      handlePatientSelection,
      createOrUpdateAppointment,
      openCancelFromEditing,
      closeCancelConfirm,
      handleCancelReasonChange,
      handleCancelAppointment,
      openStatusModal,
      closeStatusModal,
      setSelectedStatus,
      handleStatusUpdate,
      openPaymentModal,
      closePaymentModal,
      handlePaymentTreatmentChange,
      handlePaymentFieldChange,
      handleRegisterPayment,
    },
    derived: {
      days,
      slots,
      weekLabel,
      todayIndex,
      isCurrentWeek,
      isWithinHours,
      nowSlot,
      resolvedColors,
      isDoctor,
      canEdit,
      canChangeStatus,
      canManageDailyCash,
      isSlotSelectionUnavailable,
      canDropAppointmentAt,
      slotToDate: slotDate,
    },
  };
}
