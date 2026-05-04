"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CreateContinuousTreatmentPlanUseCase,
  SaveAppointmentUseCase,
  UpdateAppointmentPaymentUseCase,
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
import { CreateCashMovementUseCase, GetCrmTreatmentsUseCase, GetDailyCashUseCase } from "@/domain/crm/usecases/CrmUseCases";
import { GetPatientDetailUseCase, GetPatientsUseCase } from "@/domain/patients/usecases/PatientsUseCases";
import { GetUsersUseCase } from "@/domain/users/usecases/UserUseCases";
import { normalizeId } from "@/lib/normalize";
import {
  CANCEL_REASON_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  SLOT_MINUTES,
} from "./agenda.constants";
import type {
  AgendaAppointment,
  AgendaBox,
  AgendaCalendarMode,
  AgendaDailyCashItem,
  AgendaDailyCashSummary,
  AgendaDoctor,
  AgendaDoctorViewMode,
  AgendaGridColumn,
  AgendaPatient,
  AgendaSelection,
  AgendaTreatment,
  AgendaView,
  AppointmentFormState,
  ContinuousPlanFormState,
  PaymentFormState,
  StatusOption,
} from "./agenda.types";
import {
  addDays,
  buildSlots,
  buildDayLabel,
  buildWeekDays,
  buildWeekLabel,
  createEmptyAppointmentForm,
  createEmptyContinuousPlanForm,
  formatDateValue,
  formatTimeValue,
  hasAppointmentOverlap,
  isSameDay,
  isVisibleAgendaStatus,
  slotToDateForDay,
  slotToDate,
  startOfDay,
  startOfWeek,
  toSlotIndex,
} from "./agenda.utils";
import { resolveStatusColors, type AppointmentStatus, type StatusColorMap } from "./statusColors";

type AppointmentFormField = keyof AppointmentFormState;
type PaymentFormField = keyof PaymentFormState;
type ContinuousPlanFormField = Exclude<keyof ContinuousPlanFormState, "enabled" | "treatmentIds">;

function createInitialPaymentForm(
  appointment: AgendaAppointment | null,
  treatments: AgendaTreatment[],
): PaymentFormState {
  const paymentEntry = appointment?.paymentEntry ?? null;
  const defaultTreatment = treatments[0];
  const selectedTreatment =
    treatments.find((item) => item.id === paymentEntry?.treatment.id) ?? defaultTreatment;

  return {
    treatmentId: paymentEntry?.treatment.id ?? selectedTreatment?.id ?? "",
    status: paymentEntry?.status ?? appointment?.paymentStatus ?? "PENDING",
    amount: paymentEntry
      ? `${Math.round(paymentEntry.amount)}`
      : selectedTreatment
        ? `${Math.round(selectedTreatment.price)}`
        : "",
    notes: (paymentEntry?.notes ?? "").slice(0, NOTE_MAX_LENGTH),
  };
}

export function useAgendaViewModel() {
  const {
    getCurrentSessionUseCase,
    getAppointmentsUseCase,
    saveAppointmentUseCase,
    createContinuousTreatmentPlanUseCase,
    cancelAppointmentUseCase,
    updateAppointmentStatusUseCase,
    updateAppointmentScheduleUseCase,
    getPatientsUseCase,
    getPatientDetailUseCase,
    getUsersUseCase,
    getBoxesUseCase,
    getCrmTreatmentsUseCase,
    getDailyCashUseCase,
    createCashMovementUseCase,
    updateAppointmentPaymentUseCase,
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
      createContinuousTreatmentPlanUseCase: new CreateContinuousTreatmentPlanUseCase(appointmentsRepo),
      cancelAppointmentUseCase: new CancelAppointmentUseCase(appointmentsRepo),
      updateAppointmentStatusUseCase: new UpdateAppointmentStatusUseCase(appointmentsRepo),
      updateAppointmentScheduleUseCase: new UpdateAppointmentScheduleUseCase(appointmentsRepo),
      getPatientsUseCase: new GetPatientsUseCase(patientsRepo),
      getPatientDetailUseCase: new GetPatientDetailUseCase(patientsRepo),
      getUsersUseCase: new GetUsersUseCase(usersRepo),
      getBoxesUseCase: new GetBoxesUseCase(boxesRepo),
      getCrmTreatmentsUseCase: new GetCrmTreatmentsUseCase(crmRepo),
      getDailyCashUseCase: new GetDailyCashUseCase(crmRepo),
      createCashMovementUseCase: new CreateCashMovementUseCase(crmRepo),
      updateAppointmentPaymentUseCase: new UpdateAppointmentPaymentUseCase(appointmentsRepo),
      getStatusColorsUseCase: new GetStatusColorsUseCase(clinicSettingsRepo),
      saveStatusColorsUseCase: new SaveStatusColorsUseCase(clinicSettingsRepo),
      resetStatusColorsUseCase: new ResetStatusColorsUseCase(clinicSettingsRepo),
    };
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [patients, setPatients] = useState<AgendaPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [doctors, setDoctors] = useState<AgendaDoctor[]>([]);
  const [boxes, setBoxes] = useState<AgendaBox[]>([]);
  const [treatments, setTreatments] = useState<AgendaTreatment[]>([]);
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [activeView, setActiveView] = useState<AgendaView>("agenda");
  const [agendaMode, setAgendaMode] = useState<AgendaCalendarMode>("general");
  const [doctorViewMode, setDoctorViewMode] = useState<AgendaDoctorViewMode>("week");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
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
    status: "PENDING",
    amount: "",
    notes: "",
  });
  const [initialPaymentForm, setInitialPaymentForm] = useState<PaymentFormState>({
    treatmentId: "",
    status: "PENDING",
    amount: "",
    notes: "",
  });
  const [form, setForm] = useState<AppointmentFormState>(() => createEmptyAppointmentForm());
  const [continuousPlanForm, setContinuousPlanForm] = useState<ContinuousPlanFormState>(
    () => createEmptyContinuousPlanForm()
  );
  const patientSearchCacheRef = useRef<Map<string, AgendaPatient[]>>(new Map());

  const selectedDay = useMemo(() => startOfDay(calendarDate), [calendarDate]);
  const weekStart = useMemo(() => startOfWeek(calendarDate), [calendarDate]);
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
      const [usersData, boxesData] = await Promise.all([
        getUsersUseCase.execute(),
        getBoxesUseCase.execute(),
      ]);
      setPatients([]);

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
  }, [getBoxesUseCase, getUsersUseCase]);

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

  const createCashMovement = useCallback(async (input: {
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
  }) => {
    await createCashMovementUseCase.execute(input);
    await loadDailyCash();
  }, [createCashMovementUseCase, loadDailyCash]);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const session = await getCurrentSessionUseCase.execute();
        setCurrentUserId(session.userId ?? null);
        setRole(session.role);
        if (session.role === "DOCTOR" && session.userId) {
          setSelectedDoctorId(session.userId);
        }
      } catch {
        setCurrentUserId(null);
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
    if (!doctors.length) {
      setSelectedDoctorId("");
      return;
    }

    setSelectedDoctorId((previous) => {
      if (previous && doctors.some((doctor) => doctor.id === previous)) {
        return previous;
      }

      if (role === "DOCTOR" && currentUserId && doctors.some((doctor) => doctor.id === currentUserId)) {
        return currentUserId;
      }

      return doctors[0]?.id ?? "";
    });
  }, [currentUserId, doctors, role]);

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

  useEffect(() => {
    if (!detailAppointment || !treatments.length) return;

    setInitialPaymentForm((previous) => {
      if (previous.treatmentId) {
        return previous;
      }

      return createInitialPaymentForm(detailAppointment, treatments);
    });

    setPaymentForm((previous) => {
      if (previous.treatmentId) {
        return previous;
      }

      return createInitialPaymentForm(detailAppointment, treatments);
    });
  }, [detailAppointment, treatments]);

  useEffect(() => {
    const normalizedRun = normalizeId(form.patientRun);

    if (normalizedRun.length < 3) {
      setPatients([]);
      setPatientSearchLoading(false);
      return;
    }

    const cached = patientSearchCacheRef.current.get(normalizedRun);
    if (cached) {
      setPatients(cached);
      setPatientSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setPatientSearchLoading(true);
      try {
        const result = await getPatientsUseCase.execute({
          query: normalizedRun,
          pageSize: 8,
        });

        if (cancelled) return;

        const nextPatients = result.items.map((patient) => ({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          run: patient.run,
          email: patient.email ?? null,
          phone: patient.phone ?? null,
        }));

        patientSearchCacheRef.current.set(normalizedRun, nextPatients);
        setPatients(nextPatients);
      } catch {
        if (!cancelled) {
          setPatients([]);
        }
      } finally {
        if (!cancelled) {
          setPatientSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [form.patientRun, getPatientsUseCase]);

  const isDoctorDayView = agendaMode === "doctor" && doctorViewMode === "day";
  const usesDayNavigation = agendaMode === "boxDay" || isDoctorDayView;
  const periodLabel = useMemo(
    () => (usesDayNavigation ? buildDayLabel(selectedDay) : buildWeekLabel(weekStart)),
    [selectedDay, usesDayNavigation, weekStart]
  );

  const generalDateColumns = useMemo<AgendaGridColumn[]>(
    () =>
      days.map((day) => ({
        id: formatDateValue(day),
        caption: day.toLocaleDateString("es-CL", { weekday: "short" }).slice(0, 2),
        label: `${day.getDate()}`,
        variant: "date",
        isToday: isSameDay(day, now),
      })),
    [days, now]
  );

  const doctorDateColumns = useMemo<AgendaGridColumn[]>(
    () =>
      (isDoctorDayView ? [selectedDay] : days).map((day) => ({
        id: formatDateValue(day),
        caption: day.toLocaleDateString("es-CL", { weekday: "short" }).slice(0, 2),
        label: `${day.getDate()}`,
        variant: "date",
        isToday: isSameDay(day, now),
      })),
    [days, isDoctorDayView, now, selectedDay]
  );

  const boxColumns = useMemo<AgendaGridColumn[]>(
    () =>
      boxes.map((box) => ({
        id: box.id,
        caption: "BOX",
        label: box.name,
        variant: "resource",
        isToday: isSameDay(selectedDay, now),
      })),
    [boxes, now, selectedDay]
  );

  const filteredAppointments = useMemo(() => {
    if (agendaMode === "boxDay") {
      return appointments.filter((item) => isSameDay(new Date(item.startAt), selectedDay));
    }

    if (agendaMode === "doctor") {
      if (!selectedDoctorId) return [];
      return appointments.filter((item) => item.doctorId === selectedDoctorId);
    }

    return appointments;
  }, [agendaMode, appointments, selectedDay, selectedDoctorId]);

  const agendaColumns = useMemo(() => {
    if (agendaMode === "boxDay") {
      return boxColumns;
    }

    if (agendaMode === "doctor") {
      return doctorDateColumns;
    }

    return generalDateColumns;
  }, [agendaMode, boxColumns, doctorDateColumns, generalDateColumns]);

  const currentTimeColumnIndex = useMemo(() => {
    if (agendaMode === "boxDay") {
      return isSameDay(selectedDay, now) ? 0 : -1;
    }

    if (isDoctorDayView) {
      return isSameDay(selectedDay, now) ? 0 : -1;
    }

    return days.findIndex((day) => isSameDay(day, now));
  }, [agendaMode, days, isDoctorDayView, now, selectedDay]);

  const showCurrentTimeAcrossAllColumns = agendaMode === "boxDay";
  const isCurrentRange = currentTimeColumnIndex >= 0 && currentTimeColumnIndex < Math.max(agendaColumns.length, 1);

  const getAppointmentPlacement = useCallback(
    (appointment: AgendaAppointment) => {
      const start = new Date(appointment.startAt);
      const end = new Date(appointment.endAt);
      const slotIndex = toSlotIndex(start);
      const durationSlots = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINUTES * 60000))
      );

      if (agendaMode === "boxDay") {
        if (!isSameDay(start, selectedDay)) return null;
        const columnIndex = boxes.findIndex((box) => box.id === appointment.boxId);
        if (columnIndex < 0) return null;
        return { columnIndex, slotIndex, durationSlots };
      }

      const rangeStart = isDoctorDayView ? selectedDay : weekStart;
      const columnCount = isDoctorDayView ? 1 : days.length;
      const columnIndex = Math.floor(
        (startOfDay(start).getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (columnIndex < 0 || columnIndex >= columnCount) {
        return null;
      }

      return { columnIndex, slotIndex, durationSlots };
    },
    [agendaMode, boxes, days.length, isDoctorDayView, selectedDay, weekStart]
  );

  const slotDate = useCallback(
    (columnIndex: number, slotIndex: number) => {
      if (agendaMode === "boxDay" || isDoctorDayView) {
        void columnIndex;
        return slotToDateForDay(selectedDay, slotIndex);
      }

      return slotToDate(weekStart, columnIndex, slotIndex);
    },
    [agendaMode, isDoctorDayView, selectedDay, weekStart]
  );

  const isSlotSelectionUnavailable = useCallback((columnIndex: number, slot: number) => {
    void columnIndex;
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
    const emptyPaymentForm = createInitialPaymentForm(null, treatments);
    setPaymentForm(emptyPaymentForm);
    setInitialPaymentForm(emptyPaymentForm);
    setContinuousPlanForm(createEmptyContinuousPlanForm());
  }, [treatments]);

  const openModalForRange = useCallback(
    (columnIndex: number, startSlot: number, endSlot: number) => {
      if (!canEdit) return;

      const normalizedStart = Math.min(startSlot, endSlot);
      const normalizedEnd = Math.max(startSlot, endSlot) + 1;
      const startAt = slotDate(columnIndex, normalizedStart);
      const endAt = slotDate(columnIndex, normalizedEnd);
      const defaultDoctorId = agendaMode === "doctor" ? selectedDoctorId : "";
      const defaultBoxId = agendaMode === "boxDay" ? boxes[columnIndex]?.id ?? "" : "";

      setForm((previous) => ({
        ...previous,
        doctorId: defaultDoctorId || previous.doctorId,
        boxId: defaultBoxId || previous.boxId,
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
      setContinuousPlanForm(createEmptyContinuousPlanForm());
    },
    [agendaMode, boxes, canEdit, selectedDoctorId, slotDate]
  );

  const finalizeSelection = useCallback(() => {
    if (!isSelecting || !selection || !canEdit) return;
    setIsSelecting(false);
    openModalForRange(selection.columnIndex, selection.startSlot, selection.endSlot);
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

  const handlePointerDown = (columnIndex: number, slot: number, event?: React.PointerEvent) => {
    event?.preventDefault();
    if (!canEdit || isSlotSelectionUnavailable(columnIndex, slot)) return;

    setIsSelecting(true);
    setSelection({ columnIndex, startSlot: slot, endSlot: slot });
    setEditingId(null);
    setErrorMessage(null);
  };

  const handlePointerEnter = (columnIndex: number, slot: number) => {
    if (
      !isSelecting ||
      !selection ||
      columnIndex !== selection.columnIndex ||
      isSlotSelectionUnavailable(columnIndex, slot)
    ) {
      return;
    }

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

  const buildScheduleRange = useCallback(
    (columnIndex: number, startSlot: number, endSlot: number) => ({
      startAt: slotDate(columnIndex, startSlot),
      endAt: slotDate(columnIndex, endSlot),
    }),
    [slotDate]
  );

  const canDropAppointmentAt = useCallback(
    (appointmentId: string, columnIndex: number, slot: number) => {
      if (agendaMode === "boxDay") return false;

      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment) return false;

      const durationSlots = Math.max(
        1,
        Math.ceil(
          (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) /
            (SLOT_MINUTES * 60000)
        )
      );
      const { startAt: newStart, endAt: newEnd } = buildScheduleRange(
        columnIndex,
        slot,
        slot + durationSlots
      );

      return !hasAppointmentOverlap(appointments, {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        boxId: appointment.boxId,
        startAt: newStart,
        endAt: newEnd,
      });
    },
    [agendaMode, appointments, buildScheduleRange]
  );

  const canResizeAppointmentAt = useCallback(
    (
      appointmentId: string,
      columnIndex: number,
      startSlot: number,
      endSlot: number
    ) => {
      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment || endSlot <= startSlot) return false;

      const { startAt: newStart, endAt: newEnd } = buildScheduleRange(
        columnIndex,
        startSlot,
        endSlot
      );

      return !hasAppointmentOverlap(appointments, {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        boxId: appointment.boxId,
        startAt: newStart,
        endAt: newEnd,
      });
    },
    [appointments, buildScheduleRange]
  );

  const moveAppointment = async (appointmentId: string, columnIndex: number, slot: number) => {
    if (!canEdit || agendaMode === "boxDay") return;

    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;

    const durationSlots = Math.max(
      1,
      Math.ceil(
        (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) /
          (SLOT_MINUTES * 60000)
      )
    );
    const { startAt: newStart, endAt: newEnd } = buildScheduleRange(
      columnIndex,
      slot,
      slot + durationSlots
    );

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

  const resizeAppointment = async (
    appointmentId: string,
    columnIndex: number,
    startSlot: number,
    endSlot: number
  ) => {
    if (!canEdit || endSlot <= startSlot) return;

    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;

    const { startAt: newStart, endAt: newEnd } = buildScheduleRange(
      columnIndex,
      startSlot,
      endSlot
    );

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
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la duración de la cita.");
    }
  };

  const handleAppointmentClick = (item: AgendaAppointment) => {
    setDetailAppointment(item);
    setSelectedStatus(item.status);
    const nextPaymentForm = createInitialPaymentForm(item, treatments);
    setPaymentAppointment(item);
    setPaymentForm(nextPaymentForm);
    setInitialPaymentForm(nextPaymentForm);
    setPaymentError(null);
    setErrorMessage(null);
  };

  const openEditModal = async (item: AgendaAppointment) => {
    if (!canEdit) return;

    const startAt = new Date(item.startAt);
    const endAt = new Date(item.endAt);
    let patientRun = "";

    try {
      const patientDetail = await getPatientDetailUseCase.execute(item.patientId);
      patientRun = patientDetail?.run ?? "";
      if (patientDetail) {
        const mappedPatient = {
          id: patientDetail.id,
          firstName: patientDetail.firstName,
          lastName: patientDetail.lastName,
          run: patientDetail.run,
          email: patientDetail.email ?? null,
          phone: patientDetail.phone ?? null,
        };
        setPatients([mappedPatient]);
        patientSearchCacheRef.current.set(normalizeId(patientDetail.run), [mappedPatient]);
      }
    } catch {
      patientRun = "";
    }

    setEditingId(item.id);
    setForm({
      patientId: item.patientId,
      patientRun,
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
    setContinuousPlanForm(createEmptyContinuousPlanForm());
    setIsModalOpen(true);
    setErrorMessage(null);
    setCancelReason("");
  };

  const openEditFromDetail = () => {
    if (!detailAppointment) return;
    const item = detailAppointment;
    resetModalState();
    void openEditModal(item);
  };

  const handleAppointmentFormChange = (field: AppointmentFormField, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: field === "notes" ? value.slice(0, NOTE_MAX_LENGTH) : value,
    }));
  };

  const handleContinuousPlanFieldChange = (
    field: ContinuousPlanFormField,
    value: string
  ) => {
    setContinuousPlanForm((previous) => ({
      ...previous,
      [field]:
        field === "notes"
          ? value.slice(0, 600)
          : field === "name"
            ? value.slice(0, 120)
            : value,
    }));
  };

  const setContinuousPlanEnabled = (enabled: boolean) => {
    setContinuousPlanForm((previous) => ({
      ...previous,
      enabled,
    }));
  };

  const toggleContinuousPlanTreatment = (treatmentId: string) => {
    setContinuousPlanForm((previous) => {
      const exists = previous.treatmentIds.includes(treatmentId);
      return {
        ...previous,
        treatmentIds: exists
          ? previous.treatmentIds.filter((id) => id !== treatmentId)
          : [...previous.treatmentIds, treatmentId],
      };
    });
  };

  const handlePatientSelection = (patientId: string) => {
    const patient = patients.find((item) => item.id === patientId);
    setForm((previous) => ({
      ...previous,
      patientId,
      patientRun: patient?.run ?? previous.patientRun,
      patientFirstName: patient?.firstName ?? "",
      patientLastName: patient?.lastName ?? "",
      patientEmail: patient?.email ?? "",
      patientPhone: patient?.phone ?? "",
    }));
    setPatients([]);
  };

  const handlePatientRunChange = (value: string) => {
    const normalizedRun = normalizeId(value);
    setForm((previous) => ({
      ...previous,
      patientRun: normalizedRun,
      patientId: "",
      patientFirstName: "",
      patientLastName: "",
      patientEmail: "",
      patientPhone: "",
    }));

    if (normalizedRun.length < 3) {
      setPatients([]);
    }
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

    if (!editingId && continuousPlanForm.enabled) {
      const cleanPlanName = continuousPlanForm.name.trim();
      const cleanPlanNotes = continuousPlanForm.notes.trim();
      const totalSessions = Number.parseInt(continuousPlanForm.totalSessions, 10);
      const frequencyDays = Number.parseInt(continuousPlanForm.frequencyDays, 10);

      if (!cleanPlanName) {
        setErrorMessage("Ingresa un nombre para el plan continuo.");
        return;
      }

      if (!Number.isInteger(totalSessions) || totalSessions < 1) {
        setErrorMessage("La cantidad de sesiones debe ser un numero entero mayor o igual a 1.");
        return;
      }

      if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
        setErrorMessage("La frecuencia en dias debe ser un numero entero mayor o igual a 1.");
        return;
      }

      if (continuousPlanForm.treatmentIds.length === 0) {
        setErrorMessage("Selecciona al menos un tratamiento para crear el plan continuo.");
        return;
      }

      try {
        await createContinuousTreatmentPlanUseCase.execute({
          patientId: form.patientId,
          doctorId: form.doctorId,
          boxId: form.boxId,
          patientFirstName: cleanPatientFirstName,
          patientLastName: cleanPatientLastName,
          patientEmail: cleanPatientEmail || null,
          patientPhone: cleanPatientPhone || null,
          name: cleanPlanName,
          notes: cleanPlanNotes || null,
          treatmentIds: continuousPlanForm.treatmentIds,
          firstSessionStartAt: startAt.toISOString(),
          firstSessionEndAt: endAt.toISOString(),
          totalSessions,
          frequencyDays,
          appointmentNotes: cleanNotes || null,
        });
        await loadAgenda();
        resetModalState();
        setForm(createEmptyAppointmentForm());
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo crear el plan continuo.");
      }
      return;
    }

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

  const openCancelFromStatus = () => {
    if (!detailAppointment || !canChangeStatus) return;
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
    setPaymentAppointment(item);
    setPaymentError(null);
    setPaymentSuccess(null);
    setPaymentForm(createInitialPaymentForm(item, treatments));
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

  const hasPaymentFormChanges = useMemo(
    () =>
      paymentForm.treatmentId !== initialPaymentForm.treatmentId ||
      paymentForm.status !== initialPaymentForm.status ||
      paymentForm.amount !== initialPaymentForm.amount ||
      paymentForm.notes !== initialPaymentForm.notes,
    [initialPaymentForm, paymentForm]
  );

  const hasStatusChange = useMemo(
    () => Boolean(detailAppointment && selectedStatus && selectedStatus !== detailAppointment.status),
    [detailAppointment, selectedStatus]
  );

  const applyPaymentChanges = async () => {
    if (!paymentAppointment || !canManageDailyCash) return false;

    const amount = Number(paymentForm.amount);
    if (!paymentForm.treatmentId) {
      setPaymentError("Selecciona un tratamiento.");
      return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto valido.");
      return false;
    }

    setPaymentSaving(true);
    setPaymentError(null);

    try {
      const updatedAppointment = await updateAppointmentPaymentUseCase.execute(paymentAppointment.id, {
        treatmentId: paymentForm.treatmentId,
        status: paymentForm.status,
        amount,
        notes: paymentForm.notes.trim() || null,
      });

      const nextPaymentForm = createInitialPaymentForm(updatedAppointment, treatments);

      setAppointments((previous) =>
        previous.map((item) => (item.id === updatedAppointment.id ? updatedAppointment : item))
      );
      setDetailAppointment((previous) =>
        previous?.id === updatedAppointment.id ? updatedAppointment : previous
      );
      setPaymentAppointment(updatedAppointment);
      setPaymentSaving(false);
      setPaymentForm(nextPaymentForm);
      setInitialPaymentForm(nextPaymentForm);
      setPaymentSuccess("Cobro actualizado correctamente.");
      await loadDailyCash();
      return true;
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "No se pudo actualizar el cobro.");
      setPaymentSaving(false);
      return false;
    }
  };

  const handleStatusUpdate = async () => {
    if (!detailAppointment || !canChangeStatus) return false;
    if (!selectedStatus) {
      setErrorMessage("Selecciona un estado.");
      return false;
    }

    if (selectedStatus === detailAppointment.status) {
      setErrorMessage("Selecciona un estado distinto al actual.");
      return false;
    }

    if (selectedStatus === "CANCELLED") {
      openCancelFromStatus();
      return false;
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
      return false;
    }

    if (!isVisibleAgendaStatus(nextAppointment.status as AppointmentStatus)) {
      setAppointments((previous) => previous.filter((item) => item.id !== detailAppointment.id));
      setStatusUpdating(false);
      resetModalState();
      return true;
    }

    setAppointments((previous) =>
      previous.map((item) => (item.id === nextAppointment.id ? nextAppointment : item))
    );
    setDetailAppointment(nextAppointment);
    setSelectedStatus(nextAppointment.status);
    setStatusUpdating(false);
    return true;
  };

  const applyDetailChanges = async () => {
    if (!detailAppointment) return;

    setErrorMessage(null);
    setPaymentError(null);

    if (hasStatusChange && selectedStatus === "CANCELLED") {
      openCancelFromStatus();
      return;
    }

    if (hasPaymentFormChanges) {
      if (!paymentForm.treatmentId) {
        setPaymentError("Selecciona un tratamiento.");
        return;
      }

      const amount = Number(paymentForm.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setPaymentError("Ingresa un monto valido.");
        return;
      }
    }

    if (hasStatusChange) {
      const statusApplied = await handleStatusUpdate();
      if (!statusApplied) {
        return;
      }
    }

    if (hasPaymentFormChanges) {
      await applyPaymentChanges();
    }
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

  const goToToday = () => setCalendarDate(startOfDay(new Date()));

  const goToPreviousPeriod = () => {
    setCalendarDate((previous) => startOfDay(addDays(previous, usesDayNavigation ? -1 : -7)));
  };

  const goToNextPeriod = () => {
    setCalendarDate((previous) => startOfDay(addDays(previous, usesDayNavigation ? 1 : 7)));
  };

  const isWithinHours = now.getHours() >= 8 && now.getHours() < 20;
  const nowSlot = Math.max(0, Math.min(slots.length - 1, toSlotIndex(now)));
  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId]
  );
  const selectedDoctorLabel = useMemo(() => {
    const firstName = selectedDoctor?.profile?.firstName ?? "";
    const lastName = selectedDoctor?.profile?.lastName ?? "";
    return `${firstName} ${lastName}`.trim();
  }, [selectedDoctor]);
  const detailApplyLoading = statusUpdating || paymentSaving;
  const hasDetailChanges = hasStatusChange || hasPaymentFormChanges;

  return {
    state: {
      currentUserId,
      role,
      roleLoading,
      appointments,
      patients,
      patientSearchLoading,
      doctors,
      boxes,
      treatments,
      weekStart,
      calendarDate: selectedDay,
      activeView,
      agendaMode,
      doctorViewMode,
      selectedDoctorId,
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
      initialPaymentForm,
      form,
      continuousPlanForm,
      selection,
      now,
    },
    actions: {
      setActiveView,
      setAgendaMode,
      setDoctorViewMode,
      setSelectedDoctorId,
      goToToday,
      goToPreviousPeriod,
      goToNextPeriod,
      reloadDailyCash: loadDailyCash,
      createCashMovement,
      openStatusColors: () => setShowColorSettings(true),
      closeStatusColors,
      saveStatusColors,
      resetStatusColors,
      closeOverlay: resetModalState,
      handlePointerDown,
      handlePointerEnter,
      moveAppointment,
      resizeAppointment,
      handleAppointmentDragStart,
      handleAppointmentDragEnd,
      handleAppointmentClick,
      openEditModal,
      openEditFromDetail,
      handleAppointmentFormChange,
      handleContinuousPlanFieldChange,
      setContinuousPlanEnabled,
      toggleContinuousPlanTreatment,
      handlePatientRunChange,
      handlePatientSelection,
      createOrUpdateAppointment,
      openCancelFromEditing,
      closeCancelConfirm,
      handleCancelReasonChange,
      handleCancelAppointment,
      setSelectedStatus,
      handleStatusUpdate,
      openPaymentModal,
      closePaymentModal,
      handlePaymentTreatmentChange,
      handlePaymentFieldChange,
      handleRegisterPayment: applyPaymentChanges,
      applyDetailChanges,
    },
    derived: {
      days,
      agendaColumns,
      filteredAppointments,
      slots,
      periodLabel,
      currentTimeColumnIndex,
      isCurrentRange,
      isWithinHours,
      nowSlot,
      showCurrentTimeAcrossAllColumns,
      selectedDoctor,
      selectedDoctorLabel,
      hasDetailChanges,
      detailApplyLoading,
      resolvedColors,
      isDoctor,
      canEdit,
      canChangeStatus,
      canManageDailyCash,
      getAppointmentPlacement,
      isSlotSelectionUnavailable,
      canDropAppointmentAt,
      canResizeAppointmentAt,
      slotToDate: slotDate,
    },
  };
}
