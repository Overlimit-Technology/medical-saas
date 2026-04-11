import type { FormTemplate, TemplateField } from "../entities/FormTemplate";

export interface FormTemplatesRepository {
  getTemplates(): Promise<FormTemplate[]>;
  saveTemplate(input: {
    id?: string;
    name: string;
    description: string | null;
    fields?: TemplateField[];
  }): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
}
