import type { AgendaBannerData } from "../entities/Banner";
import type { AgendaRepository } from "../repositories/AgendaRepository";

export class GetAgendaBannerUseCase {
  constructor(private readonly repo: AgendaRepository) {}

  async execute(): Promise<AgendaBannerData | null> {
    return this.repo.getBanner();
  }
}
