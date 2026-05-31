import {
  END_HOUR,
  HIDDEN_APPOINTMENT_STATUSES,
  SLOT_MINUTES,
  START_HOUR,
} from "./agenda.constants";
import type {
  AgendaAppointment,
  AppointmentFormState,
  ContinuousPlanFormState,
} from "./agenda.types";
import type { AppointmentStatus } from "./statusColors";

export function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const diff = nextDate.getDate() - day + (day === 0 ? -6 : 1);
  nextDate.setDate(diff);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFullDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function getPatientFullName(patient: AgendaAppointment["patient"]) {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

export function isVisibleAgendaStatus(status: AppointmentStatus) {
  return !HIDDEN_APPOINTMENT_STATUSES.includes(status);
}

export function buildWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function buildSlots() {
  const slotsPerHour = 60 / SLOT_MINUTES;
  const totalSlots = (END_HOUR - START_HOUR) * slotsPerHour;
  return Array.from({ length: totalSlots }).map((_, index) => index);
}

export function slotToDateForDay(day: Date, slotIndex: number) {
  const base = startOfDay(day);
  base.setHours(START_HOUR, 0, 0, 0);
  return new Date(base.getTime() + slotIndex * SLOT_MINUTES * 60000);
}

export function slotToDate(weekStart: Date, dayIndex: number, slotIndex: number) {
  const base = new Date(weekStart);
  base.setDate(base.getDate() + dayIndex);
  base.setHours(START_HOUR, 0, 0, 0);
  return new Date(base.getTime() + slotIndex * SLOT_MINUTES * 60000);
}

export function toSlotIndex(date: Date) {
  return (date.getHours() - START_HOUR) * (60 / SLOT_MINUTES) + Math.floor(date.getMinutes() / SLOT_MINUTES);
}

export function buildWeekLabel(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startMonth = weekStart.toLocaleDateString("es-CL", { month: "short" });
  const endMonth = end.toLocaleDateString("es-CL", { month: "short" });
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(".", "");

  if (startMonth === endMonth) {
    return `${capitalize(startMonth)} ${weekStart.getDate()} - ${end.getDate()}`;
  }

  return `${capitalize(startMonth)} ${weekStart.getDate()} - ${capitalize(endMonth)} ${end.getDate()}`;
}

export function buildDayLabel(date: Date) {
  const formatter = new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return formatter
    .format(date)
    .replaceAll(".", "")
    .replace(/^./, (character) => character.toUpperCase());
}

export function hasAppointmentOverlap(
  appointments: AgendaAppointment[],
  input: {
    appointmentId?: string | null;
    patientId: string;
    doctorId: string;
    boxId: string;
    startAt: Date;
    endAt: Date;
  }
) {
  return appointments.some((item) => {
    if (input.appointmentId && item.id === input.appointmentId) return false;

    const sharesResource =
      item.doctorId === input.doctorId ||
      item.boxId === input.boxId ||
      item.patientId === input.patientId;

    if (!sharesResource) return false;

    const existingStart = new Date(item.startAt).getTime();
    const existingEnd = new Date(item.endAt).getTime();

    return input.startAt.getTime() < existingEnd && input.endAt.getTime() > existingStart;
  });
}

export function createEmptyAppointmentForm(date = new Date()): AppointmentFormState {
  const normalizedDate = startOfDay(date);
  const startAt = new Date(normalizedDate);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setMinutes(endAt.getMinutes() + 30);

  return {
    patientId: "",
    patientRun: "",
    patientFirstName: "",
    patientLastName: "",
    patientEmail: "",
    patientPhone: "",
    doctorId: "",
    boxId: "",
    date: formatDateValue(normalizedDate),
    start: formatTimeValue(startAt),
    end: formatTimeValue(endAt),
    notes: "",
  };
}

export function createEmptyContinuousPlanForm(): ContinuousPlanFormState {
  return {
    enabled: false,
    name: "",
    notes: "",
    totalSessions: "10",
    frequencyDays: "7",
    treatmentIds: [],
  };
}
