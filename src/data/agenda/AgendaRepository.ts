import type { AgendaBannerData } from "@/domain/agenda/entities/Banner";
import type { AgendaRepository } from "@/domain/agenda/repositories/AgendaRepository";

type AgendaBannerResponse = {
  ok: boolean;
  data?: AgendaBannerData;
};

export class AgendaRepositoryHttp implements AgendaRepository {
  async getBanner(): Promise<AgendaBannerData | null> {
    const res = await fetch("/api/agenda/banner", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as AgendaBannerResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.data ?? null;
  }
}
