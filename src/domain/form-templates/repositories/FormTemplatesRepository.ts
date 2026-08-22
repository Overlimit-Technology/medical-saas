import type { FormTemplate, TemplateField, TemplateType } from "../entities/FormTemplate";

export interface FormTemplatesRepository {
  getTemplates(templateType?: TemplateType): Promise<FormTemplate[]>;
  saveTemplate(input: {
    id?: string;
    name: string;
    description: string | null;
    includeLogo?: boolean;
    templateType?: TemplateType;
    fields?: TemplateField[];
  }): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
}
