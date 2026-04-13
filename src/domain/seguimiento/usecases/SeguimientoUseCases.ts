import type { SeguimientoItem, SeguimientoStats } from "../entities/SeguimientoItem";
import type { SeguimientoRepository } from "../repositories/SeguimientoRepository";

export class GetSeguimientoUseCase {
  constructor(private readonly repo: SeguimientoRepository) {}

  async execute(): Promise<{ items: SeguimientoItem[]; stats: SeguimientoStats }> {
    return this.repo.getSeguimiento();
  }
}
