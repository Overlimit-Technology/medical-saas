"use client";

import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  patient: { firstName: string; lastName: string };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};

type Patient = { id: string; firstName: string; lastName: string };

type Doctor = { id: string; profile?: { firstName: string; lastName: string } | null };

type Box = { id: string; name: string };

const START_HOUR = 8;
const END_HOUR = 19;
const SLOT_MINUTES = 30;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    boxId: "",
    date: "",
    start: "09:00",
    end: "09:30",
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
    if (data.ok) setAppointments(data.items);
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

  const toSlotIndex = (date: Date) => {
    return (date.getHours() - START_HOUR) * (60 / SLOT_MINUTES) + Math.floor(date.getMinutes() / SLOT_MINUTES);
  };

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

    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: newStart.toISOString(), endAt: newEnd.toISOString() }),
    });
    loadAgenda();
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) return;
    const startAt = new Date(`${form.date}T${form.start}:00`);
    const endAt = new Date(`${form.date}T${form.end}:00`);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.patientId,
        doctorId: form.doctorId,
        boxId: form.boxId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      loadAgenda();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Agenda</p>
            <h1 className="text-xl font-semibold text-slate-900">Calendario semanal</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-sm"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Hoy
            </button>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-sm"
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                setWeekStart(startOfWeek(prev));
              }}
            >
              Semana -
            </button>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-sm"
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(startOfWeek(next));
              }}
            >
              Semana +
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[80px_repeat(7,1fr)] gap-2 text-xs">
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center font-medium text-slate-500">
              {day.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}
            </div>
          ))}

          {slots.map((slot) => {
            const hour = START_HOUR + Math.floor((slot * SLOT_MINUTES) / 60);
            const minute = (slot * SLOT_MINUTES) % 60;
            return (
              <div key={slot} className="contents">
                <div className="text-slate-400">
                  {minute === 0 ? `${hour}:00` : ""}
                </div>
                {days.map((_, dayIndex) => (
                  <div
                    key={`${slot}-${dayIndex}`}
                    className="relative h-12 rounded-lg border border-slate-100"
                    data-slot={slot}
                    data-day={dayIndex}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            );
          })}

          {appointments.map((item) => {
            const start = new Date(item.startAt);
            const dayIndex = Math.floor((start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
            if (dayIndex < 0 || dayIndex > 6) return null;
            const slotIndex = toSlotIndex(start);
            const durationSlots = Math.max(
              1,
              Math.ceil(
                (new Date(item.endAt).getTime() - start.getTime()) / (SLOT_MINUTES * 60000)
              )
            );

            return (
              <div
                key={item.id}
                className="col-start-[2]"
                style={{
                  gridColumnStart: dayIndex + 2,
                  gridRowStart: slotIndex + 2,
                  gridRowEnd: slotIndex + 2 + durationSlots,
                }}
              >
                <div
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                  className="h-full rounded-xl border border-slate-200 bg-slate-900/90 p-2 text-[11px] text-white shadow"
                >
                  <p className="font-semibold">
                    {item.patient.firstName} {item.patient.lastName}
                  </p>
                  <p className="text-white/80">
                    {item.doctor.profile?.firstName} {item.doctor.profile?.lastName}
                  </p>
                  <p className="text-white/70">{item.box.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nueva cita</h2>
        <form onSubmit={createAppointment} className="mt-4 grid gap-3">
          <select
            value={form.patientId}
            onChange={(event) => setForm({ ...form, patientId: event.target.value })}
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
            value={form.doctorId}
            onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.profile?.firstName} {doctor.profile?.lastName}
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
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={form.start}
              onChange={(event) => setForm({ ...form, start: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={form.end}
              onChange={(event) => setForm({ ...form, end: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar cita
          </button>
        </form>
      </div>
    </div>
  );
}
