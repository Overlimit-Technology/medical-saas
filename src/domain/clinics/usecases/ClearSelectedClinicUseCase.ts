import type { ClinicsRepository } from "@/domain/clinics/repositories/ClinicsRepository";

export class ClearSelectedClinicUseCase {
  constructor(private readonly repo: ClinicsRepository) {}

  async execute(): Promise<void> {
    await this.repo.clearSelectedClinic();
  }
}
