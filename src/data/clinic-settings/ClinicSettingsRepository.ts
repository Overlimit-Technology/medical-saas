import type { ClinicStatusColorMap } from "@/domain/clinic-settings/entities/StatusColors";
import type { ClinicSettingsRepository } from "@/domain/clinic-settings/repositories/ClinicSettingsRepository";

type StatusColorsResponse = {
  ok: boolean;
  item?: ClinicStatusColorMap | null;
  error?: string;
};

export class ClinicSettingsRepositoryHttp implements ClinicSettingsRepository {
  async getStatusColors(): Promise<ClinicStatusColorMap | null> {
    const res = await fetch("/api/clinic-settings/status-colors");
    const data = (await res.json().catch(() => null)) as StatusColorsResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.item ?? null;
  }

  async saveStatusColors(colors: ClinicStatusColorMap): Promise<void> {
    const res = await fetch("/api/clinic-settings/status-colors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(colors),
    });
    const data = (await res.json().catch(() => null)) as StatusColorsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar.");
    }
  }

  async resetStatusColors(): Promise<void> {
    const res = await fetch("/api/clinic-settings/status-colors", {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as StatusColorsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo restablecer.");
    }
  }
}
