import type { Appointment } from "../entities/Appointment";
import type { AppointmentsRepository } from "../repositories/AppointmentsRepository";

export class GetAppointmentsUseCase {
  constructor(private readonly repo: AppointmentsRepository) {}

  async execute(input: { from: string; to: string }): Promise<Appointment[]> {
    return this.repo.getAppointments(input);
  }
}
