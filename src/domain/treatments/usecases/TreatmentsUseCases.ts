import type { Treatment } from "../entities/Treatment";
import type { TreatmentsRepository } from "../repositories/TreatmentsRepository";

export class GetTreatmentsUseCase {
  constructor(private readonly repo: TreatmentsRepository) {}

  async execute(): Promise<Treatment[]> {
    return this.repo.getTreatments();
  }
}

export class SaveTreatmentUseCase {
  constructor(private readonly repo: TreatmentsRepository) {}

  async execute(input: { id?: string; name: string; price: number }): Promise<void> {
    await this.repo.saveTreatment(input);
  }
}

export class DeleteTreatmentUseCase {
  constructor(private readonly repo: TreatmentsRepository) {}

  async execute(treatmentId: string): Promise<void> {
    await this.repo.deleteTreatment(treatmentId);
  }
}
