import type {
  ProfessionalPayoutEmailDispatchResult,
  ProfessionalPayoutMonthResponse,
} from "../entities/ProfessionalPayout";

export interface ProfessionalPayoutsRepository {
  getProfessionalPayouts(month: string): Promise<ProfessionalPayoutMonthResponse>;
  sendProfessionalPayoutEmails(month: string): Promise<ProfessionalPayoutEmailDispatchResult>;
}
