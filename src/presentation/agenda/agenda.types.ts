"use client";

import type { Appointment } from "@/domain/appointments/entities/Appointment";
import type { Box } from "@/domain/boxes/entities/Box";
import type { DailyCashItem, DailyCashSummary } from "@/domain/crm/entities/Crm";
import type { Patient } from "@/domain/patients/entities/Patient";
import type { Treatment } from "@/domain/treatments/entities/Treatment";
import type { User } from "@/domain/users/entities/User";
import type { AppointmentStatus, StatusColorMap } from "./statusColors";

export type AgendaAppointment = Appointment;
export type AgendaPatient = Pick<Patient, "id" | "firstName" | "lastName" | "run" | "email" | "phone">;
export type AgendaDoctor = Pick<User, "id" | "profile">;
export type AgendaBox = Pick<Box, "id" | "name">;
export type AgendaTreatment = Treatment;

export type AgendaView = "agenda" | "dailyCash";
export type AgendaCalendarMode = "general" | "boxDay" | "doctor";
export type AgendaDoctorViewMode = "day" | "week";
export type PaymentStatus = "PENDING" | "PAID" | "WAIVED";

export type AgendaSelection = {
  columnIndex: number;
  startSlot: number;
  endSlot: number;
};

export type AgendaGridColumn = {
  id: string;
  caption: string;
  label: string;
  variant?: "date" | "resource";
  isToday?: boolean;
};

export type AppointmentFormState = {
  patientId: string;
  patientRun: string;
  patientFirstName: string;
  patientLastName: string;
  patientSecondLastName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  boxId: string;
  date: string;
  start: string;
  end: string;
  notes: string;
};

export type ContinuousPlanFormState = {
  enabled: boolean;
  name: string;
  notes: string;
  totalSessions: string;
  frequencyDays: string;
  treatmentIds: string[];
};

export type PaymentFormState = {
  treatmentId: string;
  status: PaymentStatus;
  amount: string;
  notes: string;
};

export type StatusOption = AppointmentStatus | "";

export type AgendaDailyCashItem = DailyCashItem;
export type AgendaDailyCashSummary = DailyCashSummary | null;
export type AgendaStatusColorOverrides = StatusColorMap | null;
