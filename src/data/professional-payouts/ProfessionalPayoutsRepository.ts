import type { ProfessionalPayoutMonthResponse } from "@/domain/professional-payouts/entities/ProfessionalPayout";
import type { ProfessionalPayoutsRepository } from "@/domain/professional-payouts/repositories/ProfessionalPayoutsRepository";

type ProfessionalPayoutResponse = {
  ok: boolean;
  data?: ProfessionalPayoutMonthResponse;
  error?: string;
};

export class ProfessionalPayoutsRepositoryHttp implements ProfessionalPayoutsRepository {
  async getProfessionalPayouts(month: string): Promise<ProfessionalPayoutMonthResponse> {
    const searchParams = new URLSearchParams({ month });
    const res = await fetch(`/api/professional-payouts?${searchParams.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ProfessionalPayoutResponse | null;

    if (!res.ok || !data?.ok || !data.data) {
      throw new Error(data?.error ?? "No se pudo cargar la liquidacion mensual.");
    }

    return data.data;
  }
}
