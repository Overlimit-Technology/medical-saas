import type { SeguimientoItem, SeguimientoStats } from "@/domain/seguimiento/entities/SeguimientoItem";
import type { SeguimientoRepository } from "@/domain/seguimiento/repositories/SeguimientoRepository";

type SeguimientoResponse = {
  ok: boolean;
  items?: SeguimientoItem[];
  stats?: SeguimientoStats;
  error?: string;
};

export class SeguimientoRepositoryHttp implements SeguimientoRepository {
  async getSeguimiento(): Promise<{ items: SeguimientoItem[]; stats: SeguimientoStats }> {
    const res = await fetch("/api/seguimiento");
    const data = (await res.json().catch(() => null)) as SeguimientoResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo cargar el seguimiento.");
    }

    return {
      items: data.items ?? [],
      stats: data.stats ?? { total: 0, inProgress: 0, completed: 0, pendingPayments: 0 },
    };
  }
}
