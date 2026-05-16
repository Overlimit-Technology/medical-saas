import type { Appointment } from "../entities/Appointment";
import type { AppointmentsRepository } from "../repositories/AppointmentsRepository";

export class SaveAppointmentUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(
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
  ): Promise<Appointment> {
    return this.repo.saveAppointment(appointmentId, input);
  }
}

export class DeleteAppointmentUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(appointmentId: string): Promise<void> {
    await this.repo.deleteAppointment(appointmentId);
  }
}

export class CancelAppointmentUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(
    appointmentId: string,
    input: { reason: string; cancelledBy: "STAFF" | "PATIENT" | "SYSTEM" }
  ): Promise<void> {
    await this.repo.cancelAppointment(appointmentId, input);
  }
}

export class CreateContinuousTreatmentPlanUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(input: {
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
  }): Promise<void> {
    await this.repo.createContinuousTreatmentPlan(input);
  }
}

export class UpdateAppointmentStatusUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(appointmentId: string, status: string): Promise<Appointment> {
    return this.repo.updateAppointmentStatus(appointmentId, status);
  }
}

export class UpdateAppointmentPaymentUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(
    appointmentId: string,
    input: {
      treatmentId: string;
      status: "PENDING" | "PAID" | "WAIVED";
      amount: number;
      notes: string | null;
    }
  ): Promise<Appointment> {
    return this.repo.updateAppointmentPayment(appointmentId, input);
  }
}

export class UpdateAppointmentScheduleUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(appointmentId: string, input: { startAt: string; endAt: string }): Promise<Appointment> {
    return this.repo.updateAppointmentSchedule(appointmentId, input);
  }
}
