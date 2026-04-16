import type { Treatment } from "@/domain/treatments/entities/Treatment";
import type { DailyCashItem, DailyCashSummary, PaymentHistoryItem } from "../entities/Crm";
import type { CrmRepository } from "../repositories/CrmRepository";

export class GetCrmTreatmentsUseCase {
  constructor(private readonly repo: CrmRepository) {}

  async execute(): Promise<Treatment[]> {
    return this.repo.getCrmTreatments();
  }
}

export class GetPaymentHistoryUseCase {
  constructor(private readonly repo: CrmRepository) {}

  async execute(patientId: string): Promise<PaymentHistoryItem[]> {
    return this.repo.getPaymentHistory(patientId);
  }
}

export class GetDailyCashUseCase {
  constructor(private readonly repo: CrmRepository) {}

  async execute(input: { from: string; to: string }): Promise<{
    summary: DailyCashSummary | null;
    items: DailyCashItem[];
  }> {
    return this.repo.getDailyCash(input);
  }
}

export class SavePaymentHistoryUseCase {
  constructor(private readonly repo: CrmRepository) {}

  async execute(input: {
    patientId: string;
    treatmentId: string;
    recordedAt?: string;
    performedAt?: string;
    status: "PENDING" | "PAID" | "WAIVED";
    amount?: number;
    notes: string | null;
  }): Promise<void> {
    await this.repo.savePaymentHistory(input);
  }
}

export class CreateCashMovementUseCase {
  constructor(private readonly repo: CrmRepository) {}

  async execute(input: {
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
  }): Promise<void> {
    await this.repo.createCashMovement(input);
  }
}
