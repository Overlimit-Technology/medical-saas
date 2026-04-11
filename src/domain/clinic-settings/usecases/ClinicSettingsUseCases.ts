import type { ClinicStatusColorMap } from "../entities/StatusColors";
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
