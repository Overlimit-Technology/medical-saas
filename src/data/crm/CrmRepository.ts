import type { Treatment } from "@/domain/treatments/entities/Treatment";
import type { DailyCashItem, DailyCashSummary, PaymentHistoryItem } from "@/domain/crm/entities/Crm";
import type { CrmRepository } from "@/domain/crm/repositories/CrmRepository";

type CrmResponse = {
  ok: boolean;
  items?: Treatment[] | PaymentHistoryItem[] | DailyCashItem[];
  summary?: DailyCashSummary | null;
  error?: string;
};

export class CrmRepositoryHttp implements CrmRepository {
  async getCrmTreatments(): Promise<Treatment[]> {
    const res = await fetch("/api/crm/treatments");
    const data = (await res.json().catch(() => null)) as CrmResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los tratamientos.");
    }

    return (data.items ?? []) as Treatment[];
  }

  async getPaymentHistory(patientId: string): Promise<PaymentHistoryItem[]> {
    const res = await fetch(`/api/crm/payment-history?patientId=${encodeURIComponent(patientId)}`);
    const data = (await res.json().catch(() => null)) as CrmResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo cargar el historial.");
    }

    return (data.items ?? []) as PaymentHistoryItem[];
  }

  async getDailyCash(input: { from: string; to: string }): Promise<{
    summary: DailyCashSummary | null;
    items: DailyCashItem[];
  }> {
    const res = await fetch(
      `/api/crm/daily-cash?from=${encodeURIComponent(input.from)}&to=${encodeURIComponent(input.to)}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );
    const data = (await res.json().catch(() => null)) as CrmResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo cargar la caja del día.");
    }

    return {
      summary: data.summary ?? null,
      items: (data.items ?? []) as DailyCashItem[],
    };
  }

  async savePaymentHistory(input: {
    patientId: string;
    treatmentId: string;
    recordedAt?: string;
    performedAt?: string;
    status: "PENDING" | "PAID" | "WAIVED";
    amount?: number;
    notes: string | null;
  }): Promise<void> {
    const res = await fetch("/api/crm/payment-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as CrmResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo registrar el cobro.");
    }
  }

  async createCashMovement(input: {
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
  }): Promise<void> {
    const res = await fetch("/api/crm/daily-cash/movement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as CrmResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo registrar el movimiento.");
    }
  }
}
