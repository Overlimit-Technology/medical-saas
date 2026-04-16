import type { ProfessionalPayoutMonthResponse } from "../entities/ProfessionalPayout";

export interface ProfessionalPayoutsRepository {
  getProfessionalPayouts(month: string): Promise<ProfessionalPayoutMonthResponse>;
}
