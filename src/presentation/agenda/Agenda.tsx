"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InfoBanner from "./components/InfoBanner";
import StatusColorsModal from "./StatusColorsModal";
import {
  APPOINTMENT_STATUSES,
  resolveStatusColors,
  getCardClasses,
  STATUS_LABELS,
  type AppointmentStatus as AgendaAppointmentStatus,
  type StatusColorMap,
} from "./statusColors";

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: string;
  endAt: string;
  status: AgendaAppointmentStatus;
  notes?: string | null;
  patient: { firstName: string; lastName: string; email?: string | null; phone?: string | null };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

type Doctor = { id: string; profile?: { firstName: string; lastName: string } | null };

type Box = { id: string; name: string };

type Treatment = {
  id: string;
  name: string;
  price: number;
};

type AgendaView = "agenda" | "dailyCash";

type PaymentStatus = "PENDING" | "PAID" | "WAIVED";

type DailyCashItem = {
  id: string;
  recordedAt: string;
  status: PaymentStatus;
  amount: number;
  notes?: string | null;
  patientName: string;
  treatmentName: string;
};

type DailyCashPayload = {
  ok: boolean;
  summary?: {
    totalAmount: number;
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    waivedCount: number;
  };
  items?: DailyCashItem[];
  error?: string;
};

type PaymentFormState = {
  treatmentId: string;
  status: PaymentStatus;
  amount: string;
  notes: string;
};

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 22;
const SERVICE_OPTIONS = ["Consulta general", "Control", "Telemedicina", "Procedimiento"];
const NOTE_MAX_LENGTH = 250;
const CANCEL_REASON_MAX_LENGTH = 250;
const HIDDEN_APPOINTMENT_STATUSES: AgendaAppointmentStatus[] = [];
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  WAIVED: "Exento",
};

// Retorna el lunes correspondiente a la fecha indicada (hora 00:00).
function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Formatea una fecha a yyyy-mm-dd para campos <input type="date" />.
function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Formatea fecha a hh:mm en 24h para inputs de hora.
function formatTimeValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Obtiene etiqueta horaria local en formato 24h para mostrar en la UI.
function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Convierte minutos en texto legible (ej. 90 -> "1 h 30 min").
function minutesToLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFullDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getPatientFullName(patient: Appointment["patient"]) {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function isVisibleAgendaStatus(status: AgendaAppointmentStatus) {
  return !HIDDEN_APPOINTMENT_STATUSES.includes(status);
}

// Página principal con la agenda semanal interactiva.
export default function Agenda() {
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isDoctor = role === "DOCTOR";
  const canEdit = role === "ADMIN" || role === "SECRETARY";
  const canChangeStatus = role === "ADMIN" || role === "SECRETARY" || role === "DOCTOR";
  const canManageDailyCash = role === "SECRETARY";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activeView, setActiveView] = useState<AgendaView>("agenda");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{
    dayIndex: number;
    startSlot: number;
    endSlot: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTargetAppointment, setCancelTargetAppointment] = useState<Appointment | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AgendaAppointmentStatus | "">("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [statusColorOverrides, setStatusColorOverrides] = useState<StatusColorMap | null>(null);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [dailyCashLoading, setDailyCashLoading] = useState(false);
  const [dailyCashSummary, setDailyCashSummary] = useState<DailyCashPayload["summary"] | null>(null);
  const [dailyCashItems, setDailyCashItems] = useState<DailyCashItem[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    treatmentId: "",
    status: "PAID",
    amount: "",
    notes: "",
  });
  const resolvedColors = useMemo(() => resolveStatusColors(statusColorOverrides), [statusColorOverrides]);
  const [form, setForm] = useState({
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

  // Obtiene citas de la semana visible y filtra canceladas/finalizadas.
  const loadAgenda = useCallback(async () => {
    const from = new Date(weekStart);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);
    const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
    const data = await res.json();
    if (data.ok) {
      const visible = (data.items ?? []).filter(
        (item: Appointment) => isVisibleAgendaStatus(item.status)
      );
      setAppointments(visible);
    }
  }, [weekStart]);

  // Carga listas de pacientes, doctores y boxes para los selects.
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

  const loadStatusColors = async () => {
    try {
      const res = await fetch("/api/clinic-settings/status-colors");
      const data = await res.json();
      if (data.ok) setStatusColorOverrides(data.item ?? null);
    } catch { /* use defaults */ }
  };

  const loadTreatments = useCallback(async () => {
    if (!canManageDailyCash) {
      setTreatments([]);
      return;
    }

    try {
      const res = await fetch("/api/crm/treatments", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setTreatments(data.items ?? []);
        return;
      }
    } catch {
      // keep empty state
    }

    setTreatments([]);
  }, [canManageDailyCash]);

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
      const res = await fetch(
        `/api/crm/daily-cash?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(
          to.toISOString()
        )}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      const data = (await res.json()) as DailyCashPayload;
      if (!data.ok) {
        setDailyCashSummary(null);
        setDailyCashItems([]);
        return;
      }
      setDailyCashSummary(data.summary ?? null);
      setDailyCashItems(data.items ?? []);
    } catch {
      setDailyCashSummary(null);
      setDailyCashItems([]);
    } finally {
      setDailyCashLoading(false);
    }
  }, [canManageDailyCash]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    loadLookups();
    loadStatusColors();
  }, []);

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
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!paymentSuccess) return;
    const timeout = window.setTimeout(() => setPaymentSuccess(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [paymentSuccess]);

  useEffect(() => {
    if (!treatments.length) return;
    setPaymentForm((prev) => {
      const selectedTreatment = treatments.find((item) => item.id === prev.treatmentId) ?? treatments[0];
      if (!selectedTreatment) return prev;
      const nextAmount = prev.amount.trim() ? prev.amount : `${Math.round(selectedTreatment.price)}`;
      if (prev.treatmentId === selectedTreatment.id && prev.amount === nextAmount) return prev;
      return {
        ...prev,
        treatmentId: selectedTreatment.id,
        amount: nextAmount,
      };
    });
  }, [treatments]);

  // Convierte índice de día y slot en objeto Date exacto.
  const slotToDate = useCallback(
    (dayIndex: number, slotIndex: number) => {
      const base = new Date(weekStart);
      base.setDate(base.getDate() + dayIndex);
      base.setHours(START_HOUR, 0, 0, 0);
      return new Date(base.getTime() + slotIndex * SLOT_MINUTES * 60000);
    },
    [weekStart]
  );

  // Calcula el índice de slot a partir de una fecha/hora dada.
  const toSlotIndex = (date: Date) => {
    return (date.getHours() - START_HOUR) * (60 / SLOT_MINUTES) + Math.floor(date.getMinutes() / SLOT_MINUTES);
  };

  // Limpia estado del modal y selection al cerrarlo.
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
    setCancelTargetAppointment(null);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setStatusUpdating(false);
    setPaymentModalOpen(false);
    setPaymentSaving(false);
    setPaymentError(null);
    setPaymentAppointment(null);
  };

  // Prepara el formulario para crear cita en el rango seleccionado.
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

  // Maneja drag-and-drop para mover una cita a otro slot validando choques.
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

  // Comienza selección de rango al hacer pointer-down en una celda.
  const handlePointerDown = (dayIndex: number, slot: number, event?: React.PointerEvent) => {
    event?.preventDefault();
    if (!canEdit) return;
    if (isSlotUnavailable(dayIndex, slot)) return;
    setIsSelecting(true);
    setSelection({ dayIndex, startSlot: slot, endSlot: slot });
    setEditingId(null);
    setErrorMessage(null);
  };

  // Extiende selección mientras se arrastra dentro del mismo día.
  const handlePointerEnter = (dayIndex: number, slot: number) => {
    if (!isSelecting || !selection || dayIndex !== selection.dayIndex) return;
    if (isSlotUnavailable(dayIndex, slot)) return;
    setSelection({ ...selection, endSlot: slot });
  };

  // Finaliza selección y abre modal si hay rango válido.
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

  // Carga datos de la cita en el formulario para edición.
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

  // Muestra detalles rápidos al hacer clic en una cita.
  const handleAppointmentClick = (item: Appointment) => {
    setDetailAppointment(item);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setErrorMessage(null);
  };

  const openPaymentModal = (item: Appointment) => {
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

  // Valida y crea/actualiza una cita según haya id de edición.
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
    // Funcion o servicio para crear o actualizar la cita
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

  // Cancela la cita seleccionada tras confirmación.
  const handleCancelAppointment = async () => {
    if (!cancelTargetAppointment) return;
    if (!canChangeStatus) return;
    const cleanReason = cancelReason.slice(0, CANCEL_REASON_MAX_LENGTH).trim();
    if (!cleanReason) {
      setErrorMessage("Ingresa un motivo de cancelacion.");
      return;
    }
    setCancelling(true);
    setErrorMessage(null);
    const res = await fetch(`/api/appointments/${cancelTargetAppointment.id}`, {
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
    await loadAgenda();
    resetModal();
  };

  const handleRegisterPayment = async () => {
    if (!paymentAppointment) return;
    if (!canManageDailyCash) return;

    const amount = Number(paymentForm.amount);
    if (!paymentForm.treatmentId) {
      setPaymentError("Selecciona un tratamiento.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto válido.");
      return;
    }

    setPaymentSaving(true);
    setPaymentError(null);

    try {
      const res = await fetch("/api/crm/payment-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: paymentAppointment.patientId,
          treatmentId: paymentForm.treatmentId,
          performedAt: paymentAppointment.startAt,
          status: paymentForm.status,
          amount,
          notes: paymentForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPaymentError(data.error ?? "No se pudo registrar el cobro.");
        setPaymentSaving(false);
        return;
      }

      setPaymentSaving(false);
      setPaymentModalOpen(false);
      setPaymentSuccess("Cobro registrado correctamente.");
      await loadDailyCash();
    } catch {
      setPaymentError("No se pudo registrar el cobro.");
      setPaymentSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!detailAppointment) return;
    if (!canChangeStatus) return;
    if (!selectedStatus) {
      setErrorMessage("Selecciona un estado.");
      return;
    }
    if (selectedStatus === detailAppointment.status) {
      setErrorMessage("Selecciona un estado distinto al actual.");
      return;
    }
    if (selectedStatus === "CANCELLED") {
      setStatusModalOpen(false);
      setCancelReason("");
      setCancelTargetAppointment(detailAppointment);
      setCancelConfirm(true);
      setErrorMessage(null);
      return;
    }

    setStatusUpdating(true);
    setErrorMessage(null);

    const res = await fetch(`/api/appointments/${detailAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: selectedStatus }),
    });
    const data = await res.json();

    if (!data.ok) {
      setErrorMessage(data.error ?? "No se pudo actualizar el estado de la cita.");
      setStatusUpdating(false);
      return;
    }

    const nextAppointment = data.item as Appointment;

    if (!isVisibleAgendaStatus(nextAppointment.status)) {
      setAppointments((prev) => prev.filter((item) => item.id !== detailAppointment.id));
      setStatusUpdating(false);
      resetModal();
      return;
    }

    setAppointments((prev) =>
      prev.map((item) => (item.id === nextAppointment.id ? nextAppointment : item))
    );
    setDetailAppointment(nextAppointment);
    setStatusModalOpen(false);
    setSelectedStatus("");
    setStatusUpdating(false);
  };

  const todayIndex = days.findIndex((day) => day.toDateString() === now.toDateString());
  const isCurrentWeek = todayIndex >= 0 && todayIndex <= 6;
  const isWithinHours = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowSlot = Math.max(0, Math.min(slots.length - 1, toSlotIndex(now)));

  // Etiqueta legible del rango de la semana para el encabezado.
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

  if (roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">
        Cargando permisos...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Banner superior ── */}
      <InfoBanner />

      {/* ── Panel principal: Calendario ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {activeView === "agenda" ? "Calendario" : "Caja del día"}
            </h1>
            {isDoctor && (
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
                Sin edición de agenda
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {canManageDailyCash && (
              <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveView("agenda")}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    activeView === "agenda"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Agenda
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("dailyCash")}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    activeView === "dailyCash"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Caja del día
                </button>
              </div>
            )}

            {activeView === "agenda" ? (
              <>
                {role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => setShowColorSettings(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Colores de estado"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.1 2.5-.3C13.6 20.4 13 18.8 13 17c0-3.3 2.7-6 6-6 1.8 0 3.4.6 4.7 1.5.2-.8.3-1.6.3-2.5C24 6.5 19.5 2 14 2z" /><circle cx="7.5" cy="11.5" r="1.5" /><circle cx="12" cy="7.5" r="1.5" /><circle cx="16.5" cy="11.5" r="1.5" /></svg>
                  </button>
                )}
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                >
                  Hoy
                </button>
                <div className="flex items-center gap-1 rounded-full border border-slate-200 px-1 py-0.5">
                  <button
                    aria-label="Semana anterior"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    onClick={() => {
                      const prev = new Date(weekStart);
                      prev.setDate(prev.getDate() - 7);
                      setWeekStart(startOfWeek(prev));
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <span className="min-w-[120px] text-center text-sm font-medium text-slate-700">{weekLabel}</span>
                  <button
                    aria-label="Semana siguiente"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    onClick={() => {
                      const next = new Date(weekStart);
                      next.setDate(next.getDate() + 7);
                      setWeekStart(startOfWeek(next));
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void loadDailyCash()}
                className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                {dailyCashLoading ? "Actualizando..." : "Actualizar caja"}
              </button>
            )}
          </div>
        </div>

        {activeView === "agenda" ? (
          <div
            key={weekStart.getTime()}
            className="animate-grid-fade mt-5 relative select-none text-xs"
            style={{
              display: "grid",
              gridTemplateColumns: "56px repeat(7, minmax(0,1fr))",
              gridTemplateRows: `48px repeat(${slots.length}, ${SLOT_HEIGHT}px)`,
            }}
          >
          {/* Celda vacía superior-izquierda */}
          <div className="border-b border-slate-100" />

          {/* Encabezados de día */}
          {days.map((day, dayIndex) => {
            const isToday = day.toDateString() === now.toDateString();
            return (
              <div
                key={day.toISOString()}
                style={{ gridColumnStart: dayIndex + 2, gridRowStart: 1 }}
                className={`flex flex-col items-center justify-center border-b border-slate-100 pb-1 ${
                  dayIndex > 0 ? "border-l border-l-slate-50" : ""
                }`}
              >
                <span className={`text-[11px] uppercase tracking-wider ${isToday ? "font-semibold text-blue-500" : "text-slate-400"}`}>
                  {day.toLocaleDateString("es-CL", { weekday: "short" }).slice(0, 2)}
                </span>
                {isToday ? (
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200">
                    {day.getDate()}
                  </span>
                ) : (
                  <span className="mt-0.5 text-sm font-semibold text-slate-700">{day.getDate()}</span>
                )}
              </div>
            );
          })}

          {/* Etiquetas de hora */}
          {slots.map((slot) => {
            const hour = START_HOUR + Math.floor((slot * SLOT_MINUTES) / 60);
            const minute = (slot * SLOT_MINUTES) % 60;
            const row = slot + 2;
            return (
              <div
                key={`time-${slot}`}
                style={{ gridColumnStart: 1, gridRowStart: row }}
                className="flex items-start justify-end border-r border-slate-100 pr-2 pt-0.5 text-[11px] leading-none text-slate-300"
              >
                {minute === 0 ? (
                  <span className="text-slate-400">{`${hour.toString().padStart(2, "0")}:00`}</span>
                ) : null}
              </div>
            );
          })}

          {/* Celdas interactivas de la grilla */}
          {slots.map((slot) =>
            days.map((_, dayIndex) => {
              const row = slot + 2;
              const col = dayIndex + 2;
              const isToday = dayIndex === todayIndex;
              const minute = (slot * SLOT_MINUTES) % 60;
              const isHourBoundary = minute === 0;
              const isUnavailable = isSlotUnavailable(dayIndex, slot);
              return (
                <div
                  key={`${slot}-${dayIndex}`}
                  style={{ gridColumnStart: col, gridRowStart: row }}
                  className={`relative transition-colors duration-150 ${
                    isHourBoundary ? "border-t border-slate-100" : ""
                  } ${isToday ? "bg-blue-50/30" : "bg-white"} ${
                    dayIndex > 0 ? "border-l border-l-slate-50" : ""
                  } ${isUnavailable ? "cursor-not-allowed" : "hover:bg-blue-50/50"}`}
                  data-slot={slot}
                  data-day={dayIndex}
                  onPointerDown={(event) => {
                    if (isUnavailable) return;
                    handlePointerDown(dayIndex, slot, event);
                  }}
                  onPointerEnter={() => handlePointerEnter(dayIndex, slot)}
                  onDragOver={(event) => {
                    if (!canEdit || isUnavailable) return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (isUnavailable) return;
                    handleDrop(event);
                  }}
                >
                  {isUnavailable && (
                    <div className="pointer-events-none absolute inset-0 bg-slate-50/80" />
                  )}
                </div>
              );
            })
          )}

          {/* Selección de rango */}
          {selection && (
            <div
              className="pointer-events-none"
              style={{
                gridColumnStart: selection.dayIndex + 2,
                gridRowStart: Math.min(selection.startSlot, selection.endSlot) + 2,
                gridRowEnd: Math.max(selection.startSlot, selection.endSlot) + 3,
              }}
            >
              <div className="relative mx-0.5 h-full rounded-xl border-2 border-blue-300/60 bg-blue-100/50 p-2 text-[11px] text-blue-800 backdrop-blur-sm">
                <div className="font-semibold">Nueva cita</div>
                <div className="mt-0.5 text-blue-500">
                  {formatTimeLabel(slotToDate(selection.dayIndex, Math.min(selection.startSlot, selection.endSlot)))} -{" "}
                  {formatTimeLabel(slotToDate(selection.dayIndex, Math.max(selection.startSlot, selection.endSlot) + 1))}
                </div>
                <div className="text-blue-400">
                  {minutesToLabel((Math.abs(selection.endSlot - selection.startSlot) + 1) * SLOT_MINUTES)}
                </div>
              </div>
            </div>
          )}

          {/* Indicador de hora actual */}
          {isCurrentWeek && isWithinHours && (
            <div
              className="pointer-events-none z-20"
              style={{
                gridColumnStart: todayIndex + 2,
                gridRowStart: nowSlot + 2,
                gridRowEnd: nowSlot + 3,
              }}
            >
              <div className="relative h-full">
                <div className="absolute left-0 right-0 top-1/2 h-[2px] rounded-full bg-blue-500/70" />
                <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-blue-500 shadow-sm shadow-blue-300" />
                <div className="absolute -left-[58px] top-1/2 -translate-y-1/2 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                  {formatTimeLabel(now)}
                </div>
              </div>
            </div>
          )}

            {/* Tarjetas de citas */}
            {appointments.map((item, idx) => {
            const start = new Date(item.startAt);
            const end = new Date(item.endAt);
            const dayIndex = Math.floor((start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
            if (dayIndex < 0 || dayIndex > 6) return null;
            const slotIndex = toSlotIndex(start);
            const durationSlots = Math.max(
              1,
              Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINUTES * 60000))
            );
            const doctorInitial = item.doctor.profile?.firstName?.charAt(0)?.toUpperCase() ?? "?";
            const isLarge = durationSlots >= 3;
            const colors = getCardClasses(item.status, resolvedColors);

            return (
              <div
                key={item.id}
                style={{
                  gridColumnStart: dayIndex + 2,
                  gridRowStart: slotIndex + 2,
                  gridRowEnd: slotIndex + 2 + durationSlots,
                  animationDelay: `${idx * 40}ms`,
                }}
                className="z-10 animate-card-in px-0.5"
              >
                <div
                  draggable={canEdit}
                  onDragStart={(event) => {
                    if (!canEdit) return;
                    event.dataTransfer.setData("text/plain", item.id);
                    setDraggingId(item.id);
                  }}
                  onDragEnd={() => {
                    if (!canEdit) return;
                    setDraggingId(null);
                  }}
                  onClick={() => handleAppointmentClick(item)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={`group flex h-full flex-col overflow-hidden rounded-lg border ${colors.card} px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colors.shadow} ${
                    canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                  } ${draggingId && draggingId !== item.id ? "pointer-events-none opacity-40" : ""}`}
                >
                  <p className="truncate text-[11px] font-semibold leading-tight text-slate-700">
                    {`${item.patient.firstName} ${item.patient.lastName}`}
                  </p>
                  <p className={`mt-0.5 truncate text-[10px] ${colors.time}`}>
                    {formatTimeLabel(start)} - {formatTimeLabel(end)}
                  </p>
                  {isLarge && (
                    <div className="mt-auto flex -space-x-1 pt-1">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.badge} text-[9px] font-semibold ring-1 ring-white`}>
                        {doctorInitial}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recaudado hoy</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(dailyCashSummary?.totalAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Movimientos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {dailyCashSummary?.totalCount ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pagados</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-700">
                    {dailyCashSummary?.paidCount ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pendientes / Exentos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {(dailyCashSummary?.pendingCount ?? 0) + (dailyCashSummary?.waivedCount ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Movimientos del día</h3>
                    <p className="text-xs text-slate-400">Resumen de cobros registrados hoy</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {dailyCashLoading && (
                    <div className="px-4 py-6 text-sm text-slate-500">Cargando caja del día...</div>
                  )}

                  {!dailyCashLoading && dailyCashItems.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      Todavía no hay cobros registrados en la caja de hoy.
                    </div>
                  )}

                  {!dailyCashLoading &&
                    dailyCashItems.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.patientName}</p>
                          <p className="truncate text-sm text-slate-500">{item.treatmentName}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatFullDateLabel(item.recordedAt)} · {formatDateTimeLabel(item.recordedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {PAYMENT_STATUS_LABELS[item.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-semibold text-slate-900">Por estado</h3>
                </div>
                <div className="space-y-4 px-5 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Pagados</span>
                    <span className="font-semibold text-slate-900">{dailyCashSummary?.paidCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Pendientes</span>
                    <span className="font-semibold text-slate-900">{dailyCashSummary?.pendingCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Exentos</span>
                    <span className="font-semibold text-slate-900">{dailyCashSummary?.waivedCount ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-semibold text-slate-900">Registrar cobro</h3>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
                  <p>
                    Abre una cita clínica desde la agenda para registrar su tratamiento y estado de pago.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView("agenda")}
                    className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    Volver a la agenda
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Crear / Editar cita ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={resetModal} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {editingId ? "Editar cita" : "Nueva cita"}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {editingId ? "Actualizar detalles de la cita" : "Agendar cita médica"}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <form onSubmit={createOrUpdateAppointment} className="mt-6 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={form.patientFirstName}
                  onChange={(event) => setForm({ ...form, patientFirstName: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={form.patientLastName}
                  onChange={(event) => setForm({ ...form, patientLastName: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={form.patientEmail}
                  onChange={(event) => setForm({ ...form, patientEmail: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={form.patientPhone}
                  onChange={(event) => setForm({ ...form, patientPhone: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={form.service}
                  onChange={(event) => setForm({ ...form, service: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {SERVICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={form.doctorId}
                  onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Profesional</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.profile?.firstName} {doctor.profile?.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={form.patientId}
                  onChange={(event) => {
                    const value = event.target.value;
                    const patient = patients.find((item) => item.id === value);
                    setForm({
                      ...form,
                      patientId: value,
                      patientFirstName: patient?.firstName ?? "",
                      patientLastName: patient?.lastName ?? "",
                      patientEmail: patient?.email ?? "",
                      patientPhone: patient?.phone ?? "",
                    });
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </option>
                  ))}
                </select>
                <select
                  value={form.boxId}
                  onChange={(event) => setForm({ ...form, boxId: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Box</option>
                  {boxes.map((box) => (
                    <option key={box.id} value={box.id}>
                      {box.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={form.start}
                  onChange={(event) => setForm({ ...form, start: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={form.end}
                  onChange={(event) => setForm({ ...form, end: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="relative">
                <textarea
                  placeholder="Descripción"
                  value={form.notes}
                  maxLength={NOTE_MAX_LENGTH}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value.slice(0, NOTE_MAX_LENGTH) })
                  }
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 pr-16 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-300">
                  {form.notes.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>
              {errorMessage && (
                <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {errorMessage}
                </div>
              )}
              <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (editingId) {
                      const item = appointments.find((appointment) => appointment.id === editingId) ?? null;
                      setCancelTargetAppointment(item);
                      setCancelReason("");
                      setErrorMessage(null);
                      setCancelConfirm(true);
                      return;
                    }
                    resetModal();
                  }}
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                >
                  {editingId ? "Cancelar cita" : "Cancelar"}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle de cita ── */}
      {detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={resetModal} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Detalle actividad</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {detailAppointment.patient.firstName} {detailAppointment.patient.lastName}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Profesional</span>
                <span className="ml-auto font-medium text-slate-700">
                  {detailAppointment.doctor.profile?.firstName} {detailAppointment.doctor.profile?.lastName}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Box</span>
                <span className="ml-auto font-medium text-slate-700">{detailAppointment.box.name}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Horario</span>
                <span className="ml-auto font-medium text-slate-700">
                  {formatTimeLabel(new Date(detailAppointment.startAt))} -{" "}
                  {formatTimeLabel(new Date(detailAppointment.endAt))}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Fecha</span>
                <span className="ml-auto font-medium text-slate-700">
                  {new Date(detailAppointment.startAt).toLocaleDateString("es-CL")}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Estado</span>
                <span className="ml-auto font-medium text-slate-700">
                  {STATUS_LABELS[detailAppointment.status]}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Descripción</span>
                <p className="mt-1 font-medium text-slate-700">
                  {detailAppointment.notes?.trim() || "Sin descripción"}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <a
                href={`/appointments/${detailAppointment.id}`}
                className="rounded-full border border-blue-200 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                Ficha clínica
              </a>
              {(canChangeStatus || canEdit) && (
                <div className="flex gap-3">
                  {canManageDailyCash && (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(detailAppointment)}
                      className="rounded-full border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
                    >
                      Registrar cobro
                    </button>
                  )}
                  {canChangeStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(detailAppointment.status);
                        setStatusModalOpen(true);
                        setErrorMessage(null);
                      }}
                      className="rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      Estado de Cita
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const item = detailAppointment;
                        resetModal();
                        openEditModal(item);
                      }}
                      className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
                    >
                      Editar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Estado de cita ── */}
      {statusModalOpen && detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setStatusModalOpen(false);
              setSelectedStatus("");
              setErrorMessage(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Estado de Cita</h3>
            <p className="mt-2 text-sm text-slate-500">
              Estado actual: <span className="font-semibold text-slate-700">{STATUS_LABELS[detailAppointment.status]}</span>.
            </p>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as AgendaAppointmentStatus)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecciona un estado</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {errorMessage && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setStatusModalOpen(false);
                  setSelectedStatus("");
                  setErrorMessage(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:shadow-none"
                disabled={statusUpdating || !selectedStatus || selectedStatus === detailAppointment.status}
              >
                {statusUpdating ? "Actualizando..." : "Actualizar estado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancelar cita ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setCancelConfirm(false);
              setCancelReason("");
              setCancelTargetAppointment(null);
              setErrorMessage(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Cancelar cita</h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta acción cancelará la cita de {cancelTargetAppointment?.patient.firstName ?? form.patientFirstName}{" "}
              {cancelTargetAppointment?.patient.lastName ?? form.patientLastName} y notificará a los responsables
              correspondientes.
            </p>
            <div className="relative mt-4">
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value.slice(0, CANCEL_REASON_MAX_LENGTH))}
                maxLength={CANCEL_REASON_MAX_LENGTH}
                placeholder="Motivo de cancelacion"
                className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 pr-16 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-300">
                {cancelReason.length}/{CANCEL_REASON_MAX_LENGTH}
              </span>
            </div>
            {errorMessage && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCancelConfirm(false);
                  setCancelReason("");
                  setCancelTargetAppointment(null);
                  setErrorMessage(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCancelAppointment}
                className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20 disabled:cursor-not-allowed disabled:bg-rose-300 disabled:shadow-none"
                disabled={cancelling || cancelReason.trim().length === 0}
              >
                {cancelling ? "Cancelando..." : "Confirmar cancelacion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && paymentAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setPaymentModalOpen(false);
              setPaymentError(null);
              setPaymentAppointment(null);
            }}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cobro asociado a cita</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {getPatientFullName(paymentAppointment.patient)}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatFullDateLabel(paymentAppointment.startAt)} ·{" "}
                  {formatTimeLabel(new Date(paymentAppointment.startAt))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setPaymentError(null);
                  setPaymentAppointment(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Tratamiento</label>
                <select
                  value={paymentForm.treatmentId}
                  onChange={(event) => {
                    const nextTreatment = treatments.find((item) => item.id === event.target.value);
                    setPaymentForm((prev) => ({
                      ...prev,
                      treatmentId: event.target.value,
                      amount: nextTreatment ? `${Math.round(nextTreatment.price)}` : prev.amount,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Selecciona un tratamiento</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name} · {formatCurrency(treatment.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Estado de pago</label>
                  <select
                    value={paymentForm.status}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        status: event.target.value as PaymentStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Monto</label>
                  <input
                    type="number"
                    min="1"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Notas</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      notes: event.target.value.slice(0, NOTE_MAX_LENGTH),
                    }))
                  }
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {paymentError && (
                <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {paymentError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setPaymentError(null);
                    setPaymentAppointment(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegisterPayment}
                  className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/20 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
                  disabled={paymentSaving || treatments.length === 0}
                >
                  {paymentSaving ? "Guardando..." : "Registrar cobro"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Colores de estado ── */}
      {showColorSettings && (
        <StatusColorsModal
          currentOverrides={statusColorOverrides}
          onSave={(newOverrides) => {
            setStatusColorOverrides(newOverrides);
            setShowColorSettings(false);
          }}
          onReset={() => {
            setStatusColorOverrides(null);
            setShowColorSettings(false);
          }}
          onClose={() => setShowColorSettings(false)}
        />
      )}

      {paymentSuccess && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {paymentSuccess}
        </div>
      )}
    </div>
  );
}
