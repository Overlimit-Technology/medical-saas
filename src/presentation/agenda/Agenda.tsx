"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InfoBanner from "./components/InfoBanner";

type Appointment = {
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

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

type Doctor = { id: string; profile?: { firstName: string; lastName: string } | null };

type Box = { id: string; name: string };

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 32;
const SERVICE_OPTIONS = ["Consulta general", "Control", "Telemedicina", "Procedimiento"];
const NOTE_MAX_LENGTH = 250;
const CANCEL_REASON_MAX_LENGTH = 250;
const FINALIZE_CONFIRM_TEXT = "CITA FINALIZADA";

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

// Página principal con la agenda semanal interactiva.
export default function Agenda() {
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
  const [finalizeConfirm, setFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeChecked, setFinalizeChecked] = useState(false);
  const [finalizePhrase, setFinalizePhrase] = useState("");
  const [now, setNow] = useState(() => new Date());
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
    setFinalizeConfirm(false);
    setFinalizing(false);
    setFinalizeChecked(false);
    setFinalizePhrase("");
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
    setErrorMessage(null);
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

  // Finaliza una cita (COMPLETED) con doble verificacion en modal.
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
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Calendario</h1>
            {isDoctor && (
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
                Solo lectura
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
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
          </div>
        </div>

        {/* ── Grilla semanal ── */}
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
                  className={`group flex h-full flex-col overflow-hidden rounded-lg border border-blue-100/80 bg-blue-50/90 px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100/70 hover:shadow-md hover:shadow-blue-100/60 ${
                    canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                  } ${draggingId && draggingId !== item.id ? "pointer-events-none opacity-40" : ""}`}
                >
                  <p className="truncate text-[11px] font-semibold leading-tight text-slate-700">
                    {`${item.patient.firstName} ${item.patient.lastName}`}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-blue-400">
                    {formatTimeLabel(start)} - {formatTimeLabel(end)}
                  </p>
                  {isLarge && (
                    <div className="mt-auto flex -space-x-1 pt-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200/80 text-[9px] font-semibold text-blue-700 ring-1 ring-white">
                        {doctorInitial}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
              <div className="rounded-xl bg-slate-50/60 px-3.5 py-2.5">
                <span className="text-slate-400">Descripción</span>
                <p className="mt-1 font-medium text-slate-700">
                  {detailAppointment.notes?.trim() || "Sin descripción"}
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFinalizeConfirm(true);
                    setFinalizeChecked(false);
                    setFinalizePhrase("");
                    setErrorMessage(null);
                  }}
                  className="rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Finalizacion
                </button>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Finalizar cita ── */}
      {finalizeConfirm && detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setFinalizeConfirm(false);
              setFinalizeChecked(false);
              setFinalizePhrase("");
              setErrorMessage(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Finalizar cita</h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta accion marcara la cita como finalizada y la quitara de la agenda visible.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Doble verificacion: marca la confirmacion y escribe <span className="font-semibold text-slate-700">{FINALIZE_CONFIRM_TEXT}</span>.
            </p>

            <label className="mt-4 flex items-start gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={finalizeChecked}
                onChange={(event) => setFinalizeChecked(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200"
              />
              Confirmo que la atencion de esta cita fue realizada.
            </label>

            <input
              type="text"
              value={finalizePhrase}
              onChange={(event) => setFinalizePhrase(event.target.value)}
              placeholder={`Escribe: ${FINALIZE_CONFIRM_TEXT}`}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {errorMessage && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFinalizeConfirm(false);
                  setFinalizeChecked(false);
                  setFinalizePhrase("");
                  setErrorMessage(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalizeAppointment}
                className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:cursor-not-allowed disabled:bg-emerald-300 disabled:shadow-none"
                disabled={
                  finalizing ||
                  !finalizeChecked ||
                  finalizePhrase.trim().toUpperCase() !== FINALIZE_CONFIRM_TEXT
                }
              >
                {finalizing ? "Finalizando..." : "Finalizar cita"}
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
              setErrorMessage(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Cancelar cita</h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta acción cancelará la cita de {form.patientFirstName} {form.patientLastName} y notificará a los
              responsables correspondientes.
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
    </div>
  );
}
