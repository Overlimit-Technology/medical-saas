import type { FormTemplate, TemplateField, TemplateType } from "../entities/FormTemplate";
import type { FormTemplatesRepository } from "../repositories/FormTemplatesRepository";

export class GetFormTemplatesUseCase {
  constructor(private readonly repo: FormTemplatesRepository) {}

  async execute(templateType?: TemplateType): Promise<FormTemplate[]> {
    return this.repo.getTemplates(templateType);
  }
}

export class SaveFormTemplateUseCase {
  constructor(private readonly repo: FormTemplatesRepository) {}

  async execute(input: {
    id?: string;
    name: string;
    description: string | null;
    templateType?: TemplateType;
    fields?: TemplateField[];
  }): Promise<void> {
    await this.repo.saveTemplate(input);
  }
}

export class DeleteFormTemplateUseCase {
  constructor(private readonly repo: FormTemplatesRepository) {}

  async execute(templateId: string): Promise<void> {
    await this.repo.deleteTemplate(templateId);
  }
}
