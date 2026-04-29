import type { ClinicInfo, ClinicInfoInput } from "../entities/ClinicInfo";
import type { CrmSettings, CrmSettingsInput } from "../entities/CrmSettings";
import type { ClinicStatusColorMap } from "../entities/StatusColors";
import type { ProfessionalPayoutSettings } from "../entities/ProfessionalPayoutSettings";

export interface ClinicSettingsRepository {
  getClinicInfo(): Promise<ClinicInfo>;
  updateClinicInfo(input: ClinicInfoInput): Promise<ClinicInfo>;
  getCrmSettings(): Promise<CrmSettings>;
  updateCrmSettings(input: CrmSettingsInput): Promise<CrmSettings>;
  getStatusColors(): Promise<ClinicStatusColorMap | null>;
  saveStatusColors(colors: ClinicStatusColorMap): Promise<void>;
  resetStatusColors(): Promise<void>;
  getProfessionalPayoutSettings(): Promise<ProfessionalPayoutSettings>;
  saveProfessionalPayoutSettings(settings: ProfessionalPayoutSettings): Promise<void>;
}
