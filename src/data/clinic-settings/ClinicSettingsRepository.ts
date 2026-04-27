import type { ClinicStatusColorMap } from "@/domain/clinic-settings/entities/StatusColors";
import type { ProfessionalPayoutSettings } from "@/domain/clinic-settings/entities/ProfessionalPayoutSettings";
import type { ClinicSettingsRepository } from "@/domain/clinic-settings/repositories/ClinicSettingsRepository";

type StatusColorsResponse = {
  ok: boolean;
  item?: ClinicStatusColorMap | null;
  error?: string;
};

type ProfessionalPayoutSettingsResponse = {
  ok: boolean;
  item?: ProfessionalPayoutSettings;
  error?: string;
};

export class ClinicSettingsRepositoryHttp implements ClinicSettingsRepository {
  async getStatusColors(): Promise<ClinicStatusColorMap | null> {
    const res = await fetch("/api/clinic-settings/status-colors", {
      credentials: "include",
      cache: "no-store",
    });
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
      credentials: "include",
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
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as StatusColorsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo restablecer.");
    }
  }

  async getProfessionalPayoutSettings(): Promise<ProfessionalPayoutSettings> {
    const res = await fetch("/api/clinic-settings/professional-payouts", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ProfessionalPayoutSettingsResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo cargar la configuracion de liquidaciones.");
    }

    return data.item;
  }

  async saveProfessionalPayoutSettings(settings: ProfessionalPayoutSettings): Promise<void> {
    const res = await fetch("/api/clinic-settings/professional-payouts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
    const data = (await res.json().catch(() => null)) as ProfessionalPayoutSettingsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar la configuracion de liquidaciones.");
    }
  }
}
