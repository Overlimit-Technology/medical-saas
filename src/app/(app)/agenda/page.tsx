"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  patient: { firstName: string; lastName: string };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};

type Patient = { id: string; firstName: string; lastName: string };

type Doctor = { id: string; profile?: { firstName: string; lastName: string } | null };

type Box = { id: string; name: string };

const START_HOUR = 0;
const END_HOUR = 23;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 32;
const SERVICE_OPTIONS = ["Consulta general", "Control", "Telemedicina", "Procedimiento"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesToLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export default function AgendaPage() {
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
        (item: Appointment) => item.status !== "CANCELLED"
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
    setDeleteConfirm(false);
  };

  const openModalForRange = useCallback(
    (dayIndex: number, startSlot: number, endSlot: number) => {
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
    },
    [slotToDate]
  );

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const appointmentId = event.dataTransfer.getData("text/plain");
    const slot = Number(event.currentTarget.dataset.slot ?? "0");
    const dayIndex = Number(event.currentTarget.dataset.day ?? "0");
    const base = new Date(weekStart);
    base.setDate(base.getDate() + dayIndex);
    base.setHours(START_HOUR, 0, 0, 0);
    const minutes = slot * SLOT_MINUTES;
    const newStart = new Date(base.getTime() + minutes * 60000);
    const appt = appointments.find((item) => item.id === appointmentId);
    if (!appt) return;
    const duration = new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    if (newStart.getTime() < Date.now()) return;
    const hasOverlap = appointments.some((item) => {
      if (item.id === appointmentId) return false;
      const existingStart = new Date(item.startAt).getTime();
      const existingEnd = new Date(item.endAt).getTime();
      return newStart.getTime() < existingEnd && newEnd.getTime() > existingStart;
    });
    if (hasOverlap) return;

    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: newStart.toISOString(), endAt: newEnd.toISOString() }),
    });
    loadAgenda();
  };

  const handlePointerDown = (dayIndex: number, slot: number, event?: React.PointerEvent) => {
    event?.preventDefault();
    setIsSelecting(true);
    setSelection({ dayIndex, startSlot: slot, endSlot: slot });
    setEditingId(null);
    setErrorMessage(null);
  };

  const handlePointerEnter = (dayIndex: number, slot: number) => {
    if (!isSelecting || !selection || dayIndex !== selection.dayIndex) return;
    setSelection({ ...selection, endSlot: slot });
  };

  const finalizeSelection = useCallback(() => {
    if (!isSelecting || !selection) return;
    setIsSelecting(false);
    openModalForRange(selection.dayIndex, selection.startSlot, selection.endSlot);
  }, [isSelecting, openModalForRange, selection]);

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
    const startAt = new Date(item.startAt);
    const endAt = new Date(item.endAt);
    setEditingId(item.id);
    setForm((prev) => ({
      ...prev,
      patientId: item.patientId,
      patientFirstName: item.patient.firstName,
      patientLastName: item.patient.lastName,
      patientEmail: prev.patientEmail,
      patientPhone: prev.patientPhone,
      doctorId: item.doctorId,
      boxId: item.boxId,
      date: formatDateValue(startAt),
      start: formatTimeValue(startAt),
      end: formatTimeValue(endAt),
      notes: item.notes ?? "",
    }));
    setIsModalOpen(true);
    setErrorMessage(null);
  };

  const handleAppointmentClick = (item: Appointment) => {
    setDetailAppointment(item);
    setErrorMessage(null);
  };

  const createOrUpdateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
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
    if (!form.doctorId || !form.boxId) {
      setErrorMessage("Selecciona un profesional y un box disponible.");
      return;
    }
    const hasOverlap = appointments.some((item) => {
      if (editingId && item.id === editingId) return false;
      const existingStart = new Date(item.startAt).getTime();
      const existingEnd = new Date(item.endAt).getTime();
      return startAt.getTime() < existingEnd && endAt.getTime() > existingStart;
    });
    if (hasOverlap) {
      setErrorMessage("Ya existe una cita que se superpone en ese horario.");
      return;
    }

    const payload = {
      patientId: form.patientId,
      doctorId: form.doctorId,
      boxId: form.boxId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      notes: form.notes?.trim() ? form.notes.trim() : null,
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

  const handleDeleteAppointment = async () => {
    if (!editingId) return;
    setDeleting(true);
    setErrorMessage(null);
    const res = await fetch(`/api/appointments/${editingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelado desde agenda" }),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMessage(data.error ?? "No se pudo eliminar la cita.");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setAppointments((prev) => prev.filter((item) => item.id !== editingId));
    resetModal();
  };

  const todayIndex = days.findIndex((day) => day.toDateString() === now.toDateString());
  const isCurrentWeek = todayIndex >= 0 && todayIndex <= 6;
  const isWithinHours = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowSlot = Math.max(0, Math.min(slots.length - 1, toSlotIndex(now)));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2.2fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Agenda</p>
            <h1 className="text-xl font-semibold text-slate-900">Calendario interactivo</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-slate-300"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Hoy
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
              <button
                aria-label="Semana anterior"
                className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => {
                  const prev = new Date(weekStart);
                  prev.setDate(prev.getDate() - 7);
                  setWeekStart(startOfWeek(prev));
                }}
              >
                ←
              </button>
              <span className="text-slate-500">Semana</span>
              <button
                aria-label="Semana siguiente"
                className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => {
                  const next = new Date(weekStart);
                  next.setDate(next.getDate() + 7);
                  setWeekStart(startOfWeek(next));
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div
          className="mt-6 relative text-xs"
          style={{
            display: "grid",
            gridTemplateColumns: "72px repeat(7, minmax(0,1fr))",
            gridTemplateRows: `40px repeat(${slots.length}, ${SLOT_HEIGHT}px)`,
          }}
        >
          <div className="border-b border-r border-slate-200" />
          {days.map((day, dayIndex) => {
            const isToday = day.toDateString() === now.toDateString();
            return (
              <div
                key={day.toISOString()}
                style={{ gridColumnStart: dayIndex + 2, gridRowStart: 1 }}
                className={`border-b border-slate-200 px-2 py-1 text-center font-medium ${
                  isToday ? "bg-sky-50 text-sky-700" : "text-slate-500"
                } ${dayIndex === 0 ? "" : "border-l border-slate-200"}`}
              >
                <div className="uppercase tracking-wide">{day.toLocaleDateString("es-CL", { weekday: "short" })}</div>
                <div className="text-sm font-semibold">{day.getDate()}</div>
                {isToday && <div className="mt-1 text-[10px] font-semibold text-sky-600">Hoy</div>}
              </div>
            );
          })}

          {slots.map((slot) => {
            const hour = START_HOUR + Math.floor((slot * SLOT_MINUTES) / 60);
            const minute = (slot * SLOT_MINUTES) % 60;
            const row = slot + 2;
            return (
              <div
                key={`time-${slot}`}
                style={{ gridColumnStart: 1, gridRowStart: row }}
                className="border-t border-r border-slate-200 pr-2 pt-1 text-right text-[11px] leading-none text-slate-400"
              >
                {minute === 0 ? `${hour.toString().padStart(2, "0")}:00` : ""}
              </div>
            );
          })}

          {slots.map((slot) =>
            days.map((_, dayIndex) => {
              const row = slot + 2;
              const col = dayIndex + 2;
              const isToday = dayIndex === todayIndex;
              const dayDate = days[dayIndex];
              const todayStart = new Date(now);
              todayStart.setHours(0, 0, 0, 0);
              const isPastDay = dayDate < todayStart;
              return (
                <div
                  key={`${slot}-${dayIndex}`}
                  style={{ gridColumnStart: col, gridRowStart: row }}
                  className={`relative border-t border-slate-200 transition ${
                    isToday ? "bg-sky-50/40" : "bg-white"
                  } ${dayIndex === 0 ? "" : "border-l border-slate-200"} ${
                    isPastDay ? "cursor-not-allowed bg-slate-50/60" : "hover:bg-sky-50/70"
                  }`}
                  data-slot={slot}
                  data-day={dayIndex}
                  onPointerDown={(event) => {
                    if (isPastDay) return;
                    handlePointerDown(dayIndex, slot, event);
                  }}
                  onPointerEnter={() => handlePointerEnter(dayIndex, slot)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                />
              );
            })
          )}

          {selection && (
            <div
              className="pointer-events-none"
              style={{
                gridColumnStart: selection.dayIndex + 2,
                gridRowStart: Math.min(selection.startSlot, selection.endSlot) + 2,
                gridRowEnd: Math.max(selection.startSlot, selection.endSlot) + 3,
              }}
            >
              <div className="relative h-full rounded-xl border border-sky-200 bg-sky-200/70 p-2 text-[11px] text-sky-900">
                <div className="font-semibold">Nueva cita</div>
                <div className="mt-1 text-sky-700">
                  {formatTimeLabel(slotToDate(selection.dayIndex, Math.min(selection.startSlot, selection.endSlot)))} -{" "}
                  {formatTimeLabel(slotToDate(selection.dayIndex, Math.max(selection.startSlot, selection.endSlot) + 1))}
                </div>
                <div className="text-sky-700">
                  {minutesToLabel((Math.abs(selection.endSlot - selection.startSlot) + 1) * SLOT_MINUTES)}
                </div>
              </div>
            </div>
          )}

          {isCurrentWeek && isWithinHours && (
            <div
              className="pointer-events-none"
              style={{
                gridColumnStart: todayIndex + 2,
                gridRowStart: nowSlot + 2,
                gridRowEnd: nowSlot + 3,
              }}
            >
              <div className="relative h-full">
                <div className="absolute left-0 right-0 top-1/2 h-[2px] rounded-full bg-sky-500/80" />
                <div className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-500" />
              </div>
            </div>
          )}

          {appointments.map((item) => {
            const start = new Date(item.startAt);
            const dayIndex = Math.floor((start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
            if (dayIndex < 0 || dayIndex > 6) return null;
            const slotIndex = toSlotIndex(start);
            const durationSlots = Math.max(
              1,
              Math.ceil((new Date(item.endAt).getTime() - start.getTime()) / (SLOT_MINUTES * 60000))
            );

            return (
              <div
                key={item.id}
                style={{
                  gridColumnStart: dayIndex + 2,
                  gridRowStart: slotIndex + 2,
                  gridRowEnd: slotIndex + 2 + durationSlots,
                }}
                className="z-10"
              >
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                    setDraggingId(item.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => handleAppointmentClick(item)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={`group flex h-full min-h-[24px] select-none items-center overflow-hidden rounded-lg border border-sky-200 bg-gradient-to-br from-sky-500 to-sky-600 px-2 text-[11px] text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:shadow-sky-500/40 cursor-grab active:cursor-grabbing ${
                    draggingId && draggingId !== item.id ? "pointer-events-none" : ""
                  }`}
                >
                  <p className="w-full truncate font-semibold leading-tight">
                    {item.notes?.trim() || `${item.patient.firstName} ${item.patient.lastName}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tips rápidos</h2>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
            Arrastra para crear
          </span>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            Selecciona un bloque de tiempo y suelta para agendar una nueva cita en segundos.
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            Haz clic sobre una cita existente para verla o editarla rápidamente.
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            Los horarios se ajustan automáticamente a intervalos de 15 minutos.
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20 transition-opacity animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {editingId ? "Editar cita" : "Nueva cita"}
                </p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {editingId ? "Actualizar detalles de la cita" : "Agendar cita médica"}
                </h3>
              </div>
            </div>

            <form onSubmit={createOrUpdateAppointment} className="mt-6 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={form.patientFirstName}
                  onChange={(event) => setForm({ ...form, patientFirstName: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={form.patientLastName}
                  onChange={(event) => setForm({ ...form, patientLastName: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={form.patientEmail}
                  onChange={(event) => setForm({ ...form, patientEmail: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={form.patientPhone}
                  onChange={(event) => setForm({ ...form, patientPhone: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={form.service}
                  onChange={(event) => setForm({ ...form, service: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                      patientFirstName: patient?.firstName ?? form.patientFirstName,
                      patientLastName: patient?.lastName ?? form.patientLastName,
                    });
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={form.start}
                  onChange={(event) => setForm({ ...form, start: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={form.end}
                  onChange={(event) => setForm({ ...form, end: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                placeholder="Descripción"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className="min-h-[90px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {errorMessage}
                </div>
              )}
              <div className="flex flex-col justify-end gap-3 sm:flex-row">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-full border border-rose-200 px-5 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-300"
                  >
                    Eliminar cita
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20 transition-opacity animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Detalle actividad</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {detailAppointment.patient.firstName} {detailAppointment.patient.lastName}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <span className="font-medium text-slate-900">Profesional:</span>{" "}
                {detailAppointment.doctor.profile?.firstName} {detailAppointment.doctor.profile?.lastName}
              </div>
              <div>
                <span className="font-medium text-slate-900">Box:</span> {detailAppointment.box.name}
              </div>
              <div>
                <span className="font-medium text-slate-900">Horario:</span>{" "}
                {formatTimeLabel(new Date(detailAppointment.startAt))} -{" "}
                {formatTimeLabel(new Date(detailAppointment.endAt))}
              </div>
              <div>
                <span className="font-medium text-slate-900">Fecha:</span>{" "}
                {new Date(detailAppointment.startAt).toLocaleDateString("es-CL")}
              </div>
              <div>
                <span className="font-medium text-slate-900">Descripción:</span>{" "}
                {detailAppointment.notes?.trim() || "Sin descripción"}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const item = detailAppointment;
                  resetModal();
                  openEditModal(item);
                }}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar cita</h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Estás seguro de eliminar la cita de {form.patientFirstName} {form.patientLastName}? Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAppointment}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
