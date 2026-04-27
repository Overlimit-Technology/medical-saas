import type { ClinicStatusColorMap } from "../entities/StatusColors";
import type { ProfessionalPayoutSettings } from "../entities/ProfessionalPayoutSettings";

export interface ClinicSettingsRepository {
  getStatusColors(): Promise<ClinicStatusColorMap | null>;
  saveStatusColors(colors: ClinicStatusColorMap): Promise<void>;
  resetStatusColors(): Promise<void>;
  getProfessionalPayoutSettings(): Promise<ProfessionalPayoutSettings>;
  saveProfessionalPayoutSettings(settings: ProfessionalPayoutSettings): Promise<void>;
}
