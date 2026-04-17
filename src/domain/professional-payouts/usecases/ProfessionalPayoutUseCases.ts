import type {
  ProfessionalPayoutEmailDispatchResult,
  ProfessionalPayoutMonthResponse,
} from "../entities/ProfessionalPayout";
import type { ProfessionalPayoutsRepository } from "../repositories/ProfessionalPayoutsRepository";

export class GetProfessionalPayoutsUseCase {
  constructor(private readonly repo: ProfessionalPayoutsRepository) {}

  async execute(month: string): Promise<ProfessionalPayoutMonthResponse> {
    return this.repo.getProfessionalPayouts(month);
  }
}

export class SendProfessionalPayoutEmailsUseCase {
  constructor(private readonly repo: ProfessionalPayoutsRepository) {}

  async execute(month: string): Promise<ProfessionalPayoutEmailDispatchResult> {
    return this.repo.sendProfessionalPayoutEmails(month);
  }
}
