import type { ProfessionalPayoutMonthResponse } from "../entities/ProfessionalPayout";
import type { ProfessionalPayoutsRepository } from "../repositories/ProfessionalPayoutsRepository";

export class GetProfessionalPayoutsUseCase {
  constructor(private readonly repo: ProfessionalPayoutsRepository) {}

  async execute(month: string): Promise<ProfessionalPayoutMonthResponse> {
    return this.repo.getProfessionalPayouts(month);
  }
}
