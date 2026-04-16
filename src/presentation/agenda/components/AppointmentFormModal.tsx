"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { END_HOUR, NOTE_MAX_LENGTH, SLOT_MINUTES, START_HOUR } from "../agenda.constants";
import { normalizeId } from "@/lib/normalize";
import type {
  AgendaBox,
  AgendaDoctor,
  AgendaPatient,
  AppointmentFormState,
} from "../agenda.types";

const CALENDAR_WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const dateLabelFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function toMonthStart(value?: string) {
  if (value) {
    const parsedDate = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const leadingEmptyDays = (firstDayOfMonth.getDay() + 6) % 7;
  const calendarDays: Array<Date | null> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day += 1) {
    calendarDays.push(new Date(year, month, day));
  }

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return calendarDays;
}

function buildTimeSlots() {
  const slots: string[] = [];

  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      if (hour === END_HOUR && minute > 0) {
        continue;
      }
      slots.push(`${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`);
    }
  }

  return slots;
}

type Props = {
  editingId: string | null;
  form: AppointmentFormState;
  patients: AgendaPatient[];
  patientSearchLoading: boolean;
  doctors: AgendaDoctor[];
  boxes: AgendaBox[];
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (field: keyof AppointmentFormState, value: string) => void;
  onPatientRunChange: (value: string) => void;
  onPatientSelect: (patientId: string) => void;
  onOpenCancelConfirm: () => void;
};

export default function AppointmentFormModal({
  editingId,
  form,
  patients,
  patientSearchLoading,
  doctors,
  boxes,
  errorMessage,
  onClose,
  onSubmit,
  onFieldChange,
  onPatientRunChange,
  onPatientSelect,
  onOpenCancelConfirm,
}: Props) {
  const shouldShowPatientResults = !form.patientId && normalizeId(form.patientRun).length >= 3;
  const fieldClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all duration-200 focus:border-[#19b3bc] focus:outline-none focus:ring-2 focus:ring-[#19b3bc]/15";
  const dropdownTriggerClassName =
    "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:border-[#19b3bc]/40 focus:outline-none";
  const dropdownPanelClassName =
    "animate-fade-in absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#19b3bc]/20 bg-white shadow-xl shadow-[#19b3bc]/10";
  const dropdownItemClassName =
    "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-[#19b3bc]/5";
  const [openDropdown, setOpenDropdown] = useState<"doctor" | "box" | "date" | "start" | "end" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => toMonthStart(form.date));
  const doctorDropdownRef = useRef<HTMLDivElement | null>(null);
  const boxDropdownRef = useRef<HTMLDivElement | null>(null);
  const dateDropdownRef = useRef<HTMLDivElement | null>(null);
  const startDropdownRef = useRef<HTMLDivElement | null>(null);
  const endDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        doctorDropdownRef.current?.contains(target) ||
        boxDropdownRef.current?.contains(target) ||
        dateDropdownRef.current?.contains(target) ||
        startDropdownRef.current?.contains(target) ||
        endDropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setCalendarMonth(toMonthStart(form.date));
  }, [form.date]);

  const selectedDoctorLabel = useMemo(() => {
    const selectedDoctor = doctors.find((doctor) => doctor.id === form.doctorId);
    return selectedDoctor
      ? `${selectedDoctor.profile?.firstName ?? ""} ${selectedDoctor.profile?.lastName ?? ""}`.trim()
      : "Profesional";
  }, [doctors, form.doctorId]);

  const selectedBoxLabel = useMemo(() => {
    const selectedBox = boxes.find((box) => box.id === form.boxId);
    return selectedBox?.name ?? "Box";
  }, [boxes, form.boxId]);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const selectedDateLabel = useMemo(() => {
    if (!form.date) {
      return "Fecha";
    }

    const selectedDate = new Date(`${form.date}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      return "Fecha";
    }

    return dateLabelFormatter.format(selectedDate);
  }, [form.date]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
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
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Run"
              value={form.patientRun}
              onChange={(event) => onPatientRunChange(event.target.value)}
              className={fieldClassName}
            />

            {shouldShowPatientResults && (
              <div className="animate-fade-in absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#19b3bc]/20 bg-white shadow-xl shadow-[#19b3bc]/10">
                {patientSearchLoading ? (
                  <div className="px-4 py-3 text-sm text-slate-500">Buscando pacientes...</div>
                ) : patients.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => onPatientSelect(patient.id)}
                        className="flex w-full items-start justify-between gap-3 border-b border-[#19b3bc]/10 px-4 py-3 text-left transition-colors duration-200 last:border-b-0 hover:bg-[#19b3bc]/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            RUN {patient.run}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-[11px] text-slate-400">
                          {patient.phone || patient.email || ""}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No se encontraron pacientes para ese Run.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Nombre"
              value={form.patientFirstName}
              onChange={(event) => onFieldChange("patientFirstName", event.target.value)}
              className={fieldClassName}
            />
            <input
              type="text"
              placeholder="Apellido"
              value={form.patientLastName}
              onChange={(event) => onFieldChange("patientLastName", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={form.patientEmail}
              onChange={(event) => onFieldChange("patientEmail", event.target.value)}
              className={fieldClassName}
            />
            <input
              type="tel"
              placeholder="Número de teléfono"
              value={form.patientPhone}
              onChange={(event) => onFieldChange("patientPhone", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div ref={doctorDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((current) => (current === "doctor" ? null : "doctor"))}
                className={`${dropdownTriggerClassName} ${
                  openDropdown === "doctor"
                    ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15"
                    : ""
                }`}
              >
                <span className={form.doctorId ? "text-slate-700" : "text-slate-400"}>
                  {selectedDoctorLabel}
                </span>
                <span
                  className={`text-[#19b3bc] transition-transform duration-200 ${
                    openDropdown === "doctor" ? "rotate-180" : ""
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </button>

              {openDropdown === "doctor" && (
                <div className={dropdownPanelClassName}>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                        onClick={() => {
                          onFieldChange("doctorId", "");
                          setOpenDropdown(null);
                        }}
                      className={`${dropdownItemClassName} ${
                        !form.doctorId ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-600"
                      }`}
                    >
                      <span>Profesional</span>
                    </button>
                    {doctors.map((doctor) => {
                      const label = `${doctor.profile?.firstName ?? ""} ${doctor.profile?.lastName ?? ""}`.trim();
                      const selected = form.doctorId === doctor.id;
                      return (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => {
                            onFieldChange("doctorId", doctor.id);
                            setOpenDropdown(null);
                          }}
                          className={`${dropdownItemClassName} ${
                            selected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                          }`}
                        >
                          <span className="truncate">{label || "Profesional"}</span>
                          {selected ? (
                            <span className="text-[#19b3bc]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div ref={boxDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((current) => (current === "box" ? null : "box"))}
                className={`${dropdownTriggerClassName} ${
                  openDropdown === "box"
                    ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15"
                    : ""
                }`}
              >
                <span className={form.boxId ? "text-slate-700" : "text-slate-400"}>
                  {selectedBoxLabel}
                </span>
                <span
                  className={`text-[#19b3bc] transition-transform duration-200 ${
                    openDropdown === "box" ? "rotate-180" : ""
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </button>

              {openDropdown === "box" && (
                <div className={dropdownPanelClassName}>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                        onClick={() => {
                          onFieldChange("boxId", "");
                          setOpenDropdown(null);
                        }}
                      className={`${dropdownItemClassName} ${
                        !form.boxId ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-600"
                      }`}
                    >
                      <span>Box</span>
                    </button>
                    {boxes.map((box) => {
                      const selected = form.boxId === box.id;
                      return (
                        <button
                          key={box.id}
                          type="button"
                          onClick={() => {
                            onFieldChange("boxId", box.id);
                            setOpenDropdown(null);
                          }}
                          className={`${dropdownItemClassName} ${
                            selected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                          }`}
                        >
                          <span className="truncate">{box.name}</span>
                          {selected ? (
                            <span className="text-[#19b3bc]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div ref={dateDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((current) => (current === "date" ? null : "date"))}
                className={`${dropdownTriggerClassName} ${
                  openDropdown === "date"
                    ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15"
                    : ""
                }`}
              >
                <span className={`truncate ${form.date ? "text-slate-700" : "text-slate-400"}`}>
                  {selectedDateLabel}
                </span>
                <span
                  className={`text-[#19b3bc] transition-transform duration-200 ${
                    openDropdown === "date" ? "rotate-180" : ""
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </span>
              </button>

              {openDropdown === "date" && (
                <div className="animate-fade-in absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-2xl border border-[#19b3bc]/20 bg-white p-4 shadow-xl shadow-[#19b3bc]/10">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#19b3bc] transition-colors hover:bg-[#19b3bc]/10"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <p className="text-sm font-semibold capitalize text-slate-800">
                      {monthFormatter.format(calendarMonth)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#19b3bc] transition-colors hover:bg-[#19b3bc]/10"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                    {CALENDAR_WEEK_DAYS.map((dayLabel, index) => (
                      <span
                        key={`${dayLabel}-${index}`}
                        className="pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                      >
                        {dayLabel}
                      </span>
                    ))}
                    {calendarDays.map((calendarDay, index) => {
                      if (!calendarDay) {
                        return <span key={`empty-${index}`} className="h-10 w-10" />;
                      }

                      const dayValue = formatDateValue(calendarDay);
                      const isSelected = form.date === dayValue;
                      const isToday = formatDateValue(new Date()) === dayValue;

                      return (
                        <button
                          key={dayValue}
                          type="button"
                          onClick={() => {
                            onFieldChange("date", dayValue);
                            setOpenDropdown(null);
                          }}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? "bg-[#19b3bc] text-white shadow-lg shadow-[#19b3bc]/25"
                              : isToday
                                ? "bg-[#19b3bc]/10 text-[#0f8f98]"
                                : "text-slate-600 hover:bg-[#19b3bc]/8 hover:text-[#0f8f98]"
                          }`}
                        >
                          {calendarDay.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div ref={startDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown((current) => (current === "start" ? null : "start"))}
                  className={`${dropdownTriggerClassName} ${
                    openDropdown === "start"
                      ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15"
                      : ""
                  }`}
                >
                  <span className={form.start ? "text-slate-700" : "text-slate-400"}>
                    {form.start || "Hora inicio"}
                  </span>
                  <span
                    className={`text-[#19b3bc] transition-transform duration-200 ${
                      openDropdown === "start" ? "rotate-180" : ""
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </span>
                </button>

                {openDropdown === "start" && (
                  <div className={dropdownPanelClassName}>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {timeSlots.map((timeValue) => {
                        const selected = form.start === timeValue;
                        return (
                          <button
                            key={`start-${timeValue}`}
                            type="button"
                            onClick={() => {
                              onFieldChange("start", timeValue);
                              setOpenDropdown(null);
                            }}
                            className={`${dropdownItemClassName} ${
                              selected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                            }`}
                          >
                            <span>{timeValue}</span>
                            {selected ? (
                              <span className="text-[#19b3bc]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div ref={endDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown((current) => (current === "end" ? null : "end"))}
                  className={`${dropdownTriggerClassName} ${
                    openDropdown === "end"
                      ? "border-[#19b3bc] ring-2 ring-[#19b3bc]/15"
                      : ""
                  }`}
                >
                  <span className={form.end ? "text-slate-700" : "text-slate-400"}>
                    {form.end || "Hora fin"}
                  </span>
                  <span
                    className={`text-[#19b3bc] transition-transform duration-200 ${
                      openDropdown === "end" ? "rotate-180" : ""
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </span>
                </button>

                {openDropdown === "end" && (
                  <div className={dropdownPanelClassName}>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {timeSlots.map((timeValue) => {
                        const selected = form.end === timeValue;
                        return (
                          <button
                            key={`end-${timeValue}`}
                            type="button"
                            onClick={() => {
                              onFieldChange("end", timeValue);
                              setOpenDropdown(null);
                            }}
                            className={`${dropdownItemClassName} ${
                              selected ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "text-slate-700"
                            }`}
                          >
                            <span>{timeValue}</span>
                            {selected ? (
                              <span className="text-[#19b3bc]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative">
            <textarea
              placeholder="Descripción"
              value={form.notes}
              maxLength={NOTE_MAX_LENGTH}
              onChange={(event) => onFieldChange("notes", event.target.value)}
              className={`${fieldClassName} min-h-[90px] pr-16`}
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
              onClick={editingId ? onOpenCancelConfirm : onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {editingId ? "Cancelar cita" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#19b3bc] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#159ea7] hover:shadow-lg hover:shadow-[#19b3bc]/20"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
