import type {
  InternalAlert,
  InternalAlertsListResult,
} from "@/domain/internal-alerts/entities/InternalAlert";
import type { InternalAlertsRepository } from "@/domain/internal-alerts/repositories/InternalAlertsRepository";

type InternalAlertsListResponse = {
  ok: boolean;
  items?: InternalAlert[];
  unreadCount?: number;
  error?: string;
};

type InternalAlertsMutationResponse = {
  ok: boolean;
  error?: string;
};

export class InternalAlertsRepositoryHttp implements InternalAlertsRepository {
  async list(): Promise<InternalAlertsListResult> {
    const res = await fetch("/api/internal-alerts", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as InternalAlertsListResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar las notificaciones.");
    }

    return {
      items: data.items ?? [],
      unreadCount: data.unreadCount ?? 0,
    };
  }

  async markAsRead(alertId: string): Promise<void> {
    const res = await fetch(`/api/internal-alerts/${alertId}/read`, {
      method: "PATCH",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as InternalAlertsMutationResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo marcar la notificación como leída.");
    }
  }
}
