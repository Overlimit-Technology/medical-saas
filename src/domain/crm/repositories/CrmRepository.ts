import type { Treatment } from "@/domain/treatments/entities/Treatment";
import type { DailyCashItem, DailyCashSummary, PaymentHistoryItem } from "../entities/Crm";

export interface CrmRepository {
  getCrmTreatments(): Promise<Treatment[]>;
  getPaymentHistory(patientId: string): Promise<PaymentHistoryItem[]>;
  getDailyCash(input: { from: string; to: string }): Promise<{
    summary: DailyCashSummary | null;
    items: DailyCashItem[];
  }>;
  savePaymentHistory(input: {
    patientId: string;
    treatmentId: string;
    recordedAt?: string;
    performedAt?: string;
    status: "PENDING" | "PAID" | "WAIVED";
    amount?: number;
    notes: string | null;
  }): Promise<void>;
}
