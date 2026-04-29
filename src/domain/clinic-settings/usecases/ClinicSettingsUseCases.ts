import type { ClinicStatusColorMap } from "../entities/StatusColors";
import type { ProfessionalPayoutSettings } from "../entities/ProfessionalPayoutSettings";
import type { ClinicSettingsRepository } from "../repositories/ClinicSettingsRepository";

export class GetStatusColorsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<ClinicStatusColorMap | null> {
    return this.repo.getStatusColors();
  }
}

export class SaveStatusColorsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(colors: ClinicStatusColorMap): Promise<void> {
    await this.repo.saveStatusColors(colors);
  }
}

export class ResetStatusColorsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<void> {
    await this.repo.resetStatusColors();
  }
}

export class GetProfessionalPayoutSettingsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<ProfessionalPayoutSettings> {
    return this.repo.getProfessionalPayoutSettings();
  }
}

export class SaveProfessionalPayoutSettingsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(settings: ProfessionalPayoutSettings): Promise<void> {
    await this.repo.saveProfessionalPayoutSettings(settings);
  }
}
