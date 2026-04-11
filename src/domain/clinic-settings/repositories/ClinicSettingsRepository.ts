import type { ClinicStatusColorMap } from "../entities/StatusColors";

export interface ClinicSettingsRepository {
  getStatusColors(): Promise<ClinicStatusColorMap | null>;
  saveStatusColors(colors: ClinicStatusColorMap): Promise<void>;
  resetStatusColors(): Promise<void>;
}
