import type { SeguimientoItem, SeguimientoStats } from "../entities/SeguimientoItem";

export interface SeguimientoRepository {
  getSeguimiento(): Promise<{ items: SeguimientoItem[]; stats: SeguimientoStats }>;
}
