import type { ClinicInfo, ClinicInfoInput } from "../entities/ClinicInfo";
import type { CrmSettings, CrmSettingsInput } from "../entities/CrmSettings";
import type { ClinicStatusColorMap } from "../entities/StatusColors";
import type { ProfessionalPayoutSettings } from "../entities/ProfessionalPayoutSettings";
import type { EmailTemplate, EmailTemplateInput } from "../entities/EmailTemplate";
import type { ClinicSettingsRepository } from "../repositories/ClinicSettingsRepository";

export class GetClinicInfoUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<ClinicInfo> {
    return this.repo.getClinicInfo();
  }
}

export class UpdateClinicInfoUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(input: ClinicInfoInput): Promise<ClinicInfo> {
    return this.repo.updateClinicInfo(input);
  }
}

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

export class GetCrmSettingsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<CrmSettings> {
    return this.repo.getCrmSettings();
  }
}

export class UpdateCrmSettingsUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(input: CrmSettingsInput): Promise<CrmSettings> {
    return this.repo.updateCrmSettings(input);
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

export class GetEmailTemplatesUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(): Promise<EmailTemplate[]> {
    return this.repo.getEmailTemplates();
  }
}

export class SaveEmailTemplateUseCase {
  constructor(private readonly repo: ClinicSettingsRepository) {}

  async execute(input: EmailTemplateInput): Promise<EmailTemplate> {
    return this.repo.saveEmailTemplate(input);
  }
}
