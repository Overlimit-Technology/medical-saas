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
      startAt: string;
      endAt: string;
      notes: string | null;
      patientFirstName?: string;
      patientLastName?: string;
      patientEmail?: string | null;
      patientPhone?: string | null;
    }
  ): Promise<Appointment>;
  cancelAppointment(
    appointmentId: string,
    input: { reason: string; cancelledBy: "STAFF" | "PATIENT" | "SYSTEM" }
  ): Promise<void>;
  updateAppointmentStatus(appointmentId: string, status: string): Promise<Appointment>;
  updateAppointmentSchedule(
    appointmentId: string,
    input: { startAt: string; endAt: string }
  ): Promise<Appointment>;
}
