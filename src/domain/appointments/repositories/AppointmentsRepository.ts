import type { Appointment } from "../entities/Appointment";

export interface AppointmentsRepository {
  getAppointmentDetail(appointmentId: string): Promise<Appointment | null>;
  getAppointments(input: { from: string; to: string }): Promise<Appointment[]>;
  saveAppointment(
    appointmentId: string | null,
    input: {
      patientId: string;
      doctorId: string;
      boxId: string;
      treatmentPlanId?: string | null;
      planSessionIndex?: number | null;
      startAt: string;
      endAt: string;
      notes: string | null;
      patientFirstName?: string;
      patientLastName?: string;
      patientEmail?: string | null;
      patientPhone?: string | null;
    }
  ): Promise<Appointment>;
  createContinuousTreatmentPlan(input: {
    patientId: string;
    doctorId: string;
    boxId: string;
    patientFirstName?: string;
    patientLastName?: string;
    patientEmail?: string | null;
    patientPhone?: string | null;
    name: string;
    notes: string | null;
    treatmentIds: string[];
    firstSessionStartAt: string;
    firstSessionEndAt: string;
    totalSessions: number;
    frequencyDays: number;
    appointmentNotes: string | null;
  }): Promise<void>;
  cancelAppointment(
    appointmentId: string,
    input: { reason: string; cancelledBy: "STAFF" | "PATIENT" | "SYSTEM" }
  ): Promise<void>;
  updateAppointmentStatus(appointmentId: string, status: string): Promise<Appointment>;
  updateAppointmentPayment(
    appointmentId: string,
    input: {
      treatmentId: string;
      status: "PENDING" | "PAID" | "WAIVED";
      amount: number;
      notes: string | null;
    }
  ): Promise<Appointment>;
  updateAppointmentSchedule(
    appointmentId: string,
    input: { startAt: string; endAt: string }
  ): Promise<Appointment>;
}
