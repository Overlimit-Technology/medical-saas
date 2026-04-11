import type { Appointment } from "../entities/Appointment";
import type { AppointmentsRepository } from "../repositories/AppointmentsRepository";

export class GetAppointmentDetailUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(appointmentId: string): Promise<Appointment | null> {
    return this.repo.getAppointmentDetail(appointmentId);
  }
}
