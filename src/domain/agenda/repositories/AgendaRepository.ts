import type { AgendaBannerData } from "../entities/Banner";

export interface AgendaRepository {
  getBanner(): Promise<AgendaBannerData | null>;
}
