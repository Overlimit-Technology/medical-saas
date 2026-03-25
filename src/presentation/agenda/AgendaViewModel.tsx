"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  patient: { firstName: string; lastName: string; email?: string | null; phone?: string | null };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

export type Doctor = { id: string; profile?: { firstName: string; lastName: string } | null };

export type Box = { id: string; name: string };

export const START_HOUR = 8;
export const END_HOUR = 20;
export const SLOT_MINUTES = 15;
export const SLOT_HEIGHT = 32;
export const SERVICE_OPTIONS = ["Consulta general", "Control", "Telemedicina", "Procedimiento"];
export const NOTE_MAX_LENGTH = 250;
export const CANCEL_REASON_MAX_LENGTH = 250;
export const FINALIZE_CONFIRM_TEXT = "CITA FINALIZADA";

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function minutesToLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export type AgendaForm = {
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  boxId: string;
  service: string;
  date: string;
  start: string;
  end: string;
  notes: string;
};

export type Selection = {
  dayIndex: number;
  startSlot: number;
  endSlot: number;
} | null;

export function useAgendaViewModel() {
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isDoctor = role === "DOCTOR";
  const canEdit = role !== "DOCTOR";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [finalizeConfirm, setFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeChecked, setFinalizeChecked] = useState(false);
  const [finalizePhrase, setFinalizePhrase] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [form, setForm] = useState<AgendaForm>({
    patientId: "",
    patientFirstName: "",
    patientLastName: "",
    patientEmail: "",
    patientPhone: "",
    doctorId: "",
    boxId: "",
    service: SERVICE_OPTIONS[0],
    date: "",
    start: "09:00",
    end: "09:30",
    notes: "",
  });

  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        setRole(data.ok ? data.session?.role ?? null : null);
      } catch {
        setRole(null);
      } finally {
        setRoleLoading(false);
      }
    };
    loadRole();
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + index);
      return d;
    });
  }, [weekStart]);

  const slots = useMemo(() => {
    const slotsPerHour = 60 / SLOT_MINUTES;
    const totalSlots = (END_HOUR - START_HOUR) * slotsPerHour;
    return Array.from({ length: totalSlots }).map((_, index) => index);
  }, []);

  const loadAgenda = async () => {
    const from = new Date(weekStart);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);
    const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
    const data = await res.json();
    if (data.ok) {
      const visible = (data.items ?? []).filter(
        (item: Appointment) => item.status !== "CANCELLED" && item.status !== "COMPLETED"
      );
      setAppointments(visible);
    }
  };

  const loadLookups = async () => {
    const [patientsRes, doctorsRes, boxesRes] = await Promise.all([
      fetch("/api/patients"),
      fetch("/api/doctors"),
      fetch("/api/boxes"),
    ]);
    const patientsData = await patientsRes.json();
    const doctorsData = await doctorsRes.json();
    const boxesData = await boxesRes.json();
    if (patientsData.ok) setPatients(patientsData.items ?? []);
    if (doctorsData.ok) setDoctors(doctorsData.items ?? []);
    if (boxesData.ok) setBoxes(boxesData.items ?? []);
  };

  useEffect(() => {
    loadAgenda();
  }, [weekStart]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const slotToDate = useCallback(
    (dayIndex: number, slotIndex: number) => {
      const base = new Date(weekStart);
      base.setDate(base.getDate() + dayIndex);
      base.setHours(START_HOUR, 0, 0, 0);
      return new Date(base.getTime() + slotIndex * SLOT_MINUTES * 60000);
    },
    [weekStart]
  );

  const toSlotIndex = (date: Date) => {
    return (date.getHours() - START_HOUR) * (60 / SLOT_MINUTES) + Math.floor(date.getMinutes() / SLOT_MINUTES);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setDetailAppointment(null);
    setErrorMessage(null);
    setSelection(null);
    setIsSelecting(false);
    setCancelConfirm(false);
    setCancelling(false);
    setCancelReason("");
    setFinalizeConfirm(false);
    setFinalizing(false);
    setFinalizeChecked(false);
    setFinalizePhrase("");
  };

  const openModalForRange = useCallback(
    (dayIndex: number, startSlot: number, endSlot: number) => {
      if (!canEdit) return;
      const normalizedStart = Math.min(startSlot, endSlot);
      const normalizedEnd = Math.max(startSlot, endSlot) + 1;
      const startAt = slotToDate(dayIndex, normalizedStart);
      const endAt = slotToDate(dayIndex, normalizedEnd);
      setForm((prev) => ({
        ...prev,
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
    [canEdit, slotToDate]
  );

  const isSlotUnavailable = useCallback(
    (dayIndex: number, slot: number) => {
      const slotStart = slotToDate(dayIndex, slot);
      return slotStart.getTime() < now.getTime();
    },
    [now, slotToDate]
  );

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    const appointmentId = event.dataTransfer.getData("text/plain");
    const slot = Number(event.currentTarget.dataset.slot ?? "0");
    const dayIndex = Number(event.currentTarget.dataset.day ?? "0");
    if (isSlotUnavailable(dayIndex, slot)) {
      setErrorMessage("Ese horario no esta disponible.");
      return;
    }
    const base = new Date(weekStart);
    base.setDate(base.getDate() + dayIndex);
    base.setHours(START_HOUR, 0, 0, 0);
    const minutes = slot * SLOT_MINUTES;
    const newStart = new Date(base.getTime() + minutes * 60000);
    const appt = appointments.find((item) => item.id === appointmentId);
    if (!appt) return;
    const duration = new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    if (newStart.getTime() < Date.now()) {
      setErrorMessage("Ese horario no esta disponible.");
      return;
    }
    const hasOverlap = appointments.some((item) => {
      if (item.id === appointmentId) return false;
      const sharesResource =
        item.doctorId === appt.doctorId ||
        item.boxId === appt.boxId ||
        item.patientId === appt.patientId;
      if (!sharesResource) return false;
      const existingStart = new Date(item.startAt).getTime();
      const existingEnd = new Date(item.endAt).getTime();
      return newStart.getTime() < existingEnd && newEnd.getTime() > existingStart;
    });
    if (hasOverlap) {
      setErrorMessage("Ya existe una cita que se superpone para ese doctor, box o paciente.");
      return;
    }

    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: newStart.toISOString(), endAt: newEnd.toISOString() }),
    });
    loadAgenda();
  };

  const handlePointerDown = (dayIndex: number, slot: number, event?: React.PointerEvent) => {
    event?.preventDefault();
    if (!canEdit) return;
    if (isSlotUnavailable(dayIndex, slot)) return;
    setIsSelecting(true);
    setSelection({ dayIndex, startSlot: slot, endSlot: slot });
    setEditingId(null);
    setErrorMessage(null);
  };

  const handlePointerEnter = (dayIndex: number, slot: number) => {
    if (!isSelecting || !selection || dayIndex !== selection.dayIndex) return;
    if (isSlotUnavailable(dayIndex, slot)) return;
    setSelection({ ...selection, endSlot: slot });
  };

  const finalizeSelection = useCallback(() => {
    if (!isSelecting || !selection) return;
    if (!canEdit) return;
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

  const openEditModal = (item: Appointment) => {
    if (!canEdit) return;
    const startAt = new Date(item.startAt);
    const endAt = new Date(item.endAt);
    setEditingId(item.id);
    setForm((prev) => ({
      ...prev,
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
    }));
    setIsModalOpen(true);
    setErrorMessage(null);
    setCancelReason("");
  };

  const handleAppointmentClick = (item: Appointment) => {
    setDetailAppointment(item);
    setErrorMessage(null);
  };

  const createOrUpdateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    if (!form.date || !form.start || !form.end) return;
    const startAt = new Date(`${form.date}T${form.start}:00`);
    const endAt = new Date(`${form.date}T${form.end}:00`);
    if (startAt.getTime() < Date.now()) {
      setErrorMessage("No puedes agendar en fechas u horas pasadas.");
      return;
    }
    if (startAt >= endAt) {
      setErrorMessage("La hora de término debe ser posterior a la hora de inicio.");
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
    const hasOverlap = appointments.some((item) => {
      if (editingId && item.id === editingId) return false;
      const sharesResource =
        item.doctorId === form.doctorId ||
        item.boxId === form.boxId ||
        item.patientId === form.patientId;
      if (!sharesResource) return false;
      const existingStart = new Date(item.startAt).getTime();
      const existingEnd = new Date(item.endAt).getTime();
      return startAt.getTime() < existingEnd && endAt.getTime() > existingStart;
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
      notes: cleanNotes ? cleanNotes : null,
      ...(editingId
        ? {}
        : {
            patientFirstName: cleanPatientFirstName,
            patientLastName: cleanPatientLastName,
            patientEmail: cleanPatientEmail ? cleanPatientEmail : null,
            patientPhone: cleanPatientPhone ? cleanPatientPhone : null,
          }),
    };
    const res = await fetch(editingId ? `/api/appointments/${editingId}` : "/api/appointments", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMessage(data.error ?? "No se pudo guardar la cita.");
      return;
    }
    loadAgenda();
    resetModal();
  };

  const handleCancelAppointment = async () => {
    if (!editingId) return;
    if (!canEdit) return;
    const cleanReason = cancelReason.slice(0, CANCEL_REASON_MAX_LENGTH).trim();
    if (!cleanReason) {
      setErrorMessage("Ingresa un motivo de cancelacion.");
      return;
    }
    setCancelling(true);
    setErrorMessage(null);
    const res = await fetch(`/api/appointments/${editingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cleanReason, cancelledBy: "STAFF" }),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMessage(data.error ?? "No se pudo cancelar la cita.");
      setCancelling(false);
      return;
    }
    setCancelling(false);
    setAppointments((prev) => prev.filter((item) => item.id !== editingId));
    resetModal();
  };

  const handleFinalizeAppointment = async () => {
    if (!detailAppointment) return;
    if (!canEdit) return;

    const endAt = new Date(detailAppointment.endAt);
    if (endAt.getTime() > Date.now()) {
      setErrorMessage("Solo puedes finalizar una cita cuando su horario ya termino.");
      return;
    }

    const typedPhrase = finalizePhrase.trim().toUpperCase();
    if (!finalizeChecked || typedPhrase !== FINALIZE_CONFIRM_TEXT) {
      setErrorMessage("Debes completar la doble verificacion para finalizar la cita.");
      return;
    }

    setFinalizing(true);
    setErrorMessage(null);

    const res = await fetch(`/api/appointments/${detailAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const data = await res.json();

    if (!data.ok) {
      setErrorMessage(data.error ?? "No se pudo finalizar la cita.");
      setFinalizing(false);
      return;
    }

    setAppointments((prev) => prev.filter((item) => item.id !== detailAppointment.id));
    setFinalizing(false);
    resetModal();
  };

  const openFinalizeConfirm = () => {
    setFinalizeConfirm(true);
    setFinalizeChecked(false);
    setFinalizePhrase("");
    setErrorMessage(null);
  };

  const closeFinalizeConfirm = () => {
    setFinalizeConfirm(false);
    setFinalizeChecked(false);
    setFinalizePhrase("");
    setErrorMessage(null);
  };

  const openCancelConfirm = () => {
    setCancelReason("");
    setErrorMessage(null);
    setCancelConfirm(true);
  };

  const closeCancelConfirm = () => {
    setCancelConfirm(false);
    setCancelReason("");
    setErrorMessage(null);
  };

  const handleEditFromDetail = () => {
    const item = detailAppointment;
    resetModal();
    if (item) openEditModal(item);
  };

  const goToToday = () => setWeekStart(startOfWeek(new Date()));

  const goToPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(startOfWeek(prev));
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(startOfWeek(next));
  };

  const handlePatientSelect = (value: string) => {
    const patient = patients.find((item) => item.id === value);
    setForm({
      ...form,
      patientId: value,
      patientFirstName: patient?.firstName ?? "",
      patientLastName: patient?.lastName ?? "",
      patientEmail: patient?.email ?? "",
      patientPhone: patient?.phone ?? "",
    });
  };

  const handleFormChange = (key: keyof AgendaForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDragStart = (id: string, event: React.DragEvent) => {
    if (!canEdit) return;
    event.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    if (!canEdit) return;
    setDraggingId(null);
  };

  const todayIndex = days.findIndex((day) => day.toDateString() === now.toDateString());
  const isCurrentWeek = todayIndex >= 0 && todayIndex <= 6;
  const isWithinHours = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowSlot = Math.max(0, Math.min(slots.length - 1, toSlotIndex(now)));

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const mStart = weekStart.toLocaleDateString("es-CL", { month: "short" });
    const mEnd = end.toLocaleDateString("es-CL", { month: "short" });
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");
    if (mStart === mEnd) {
      return `${capitalize(mStart)} ${weekStart.getDate()} - ${end.getDate()}`;
    }
    return `${capitalize(mStart)} ${weekStart.getDate()} - ${capitalize(mEnd)} ${end.getDate()}`;
  }, [weekStart]);

  return {
    state: {
      role,
      roleLoading,
      isDoctor,
      canEdit,
      appointments,
      patients,
      doctors,
      boxes,
      weekStart,
      selection,
      isModalOpen,
      editingId,
      detailAppointment,
      draggingId,
      errorMessage,
      cancelConfirm,
      cancelling,
      cancelReason,
      finalizeConfirm,
      finalizing,
      finalizeChecked,
      finalizePhrase,
      now,
      form,
      days,
      slots,
      todayIndex,
      isCurrentWeek,
      isWithinHours,
      nowSlot,
      weekLabel,
    },
    actions: {
      resetModal,
      handleDrop,
      handlePointerDown,
      handlePointerEnter,
      handleAppointmentClick,
      handleEditFromDetail,
      createOrUpdateAppointment,
      handleCancelAppointment,
      handleFinalizeAppointment,
      openFinalizeConfirm,
      closeFinalizeConfirm,
      openCancelConfirm,
      closeCancelConfirm,
      goToToday,
      goToPrevWeek,
      goToNextWeek,
      handlePatientSelect,
      handleFormChange,
      handleDragStart,
      handleDragEnd,
      setCancelReason,
      setFinalizeChecked,
      setFinalizePhrase,
      isSlotUnavailable,
      slotToDate,
    },
  };
}
