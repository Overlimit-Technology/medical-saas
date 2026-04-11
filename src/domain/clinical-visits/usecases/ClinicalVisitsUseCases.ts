import type { ClinicalVisit } from "../entities/ClinicalVisit";
import type { ClinicalVisitsRepository } from "../repositories/ClinicalVisitsRepository";

export class GetClinicalVisitsUseCase {
  constructor(private readonly repo: ClinicalVisitsRepository) {}

  async execute(): Promise<ClinicalVisit[]> {
    return this.repo.getClinicalVisits();
  }
}

export class StartClinicalVisitUseCase {
  constructor(private readonly repo: ClinicalVisitsRepository) {}

  async execute(input: { patientId: string; appointmentId: string | null }): Promise<ClinicalVisit> {
    return this.repo.startClinicalVisit(input);
  }
}
