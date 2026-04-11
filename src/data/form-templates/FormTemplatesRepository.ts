import type { FormTemplate, TemplateField } from "@/domain/form-templates/entities/FormTemplate";
import type { FormTemplatesRepository } from "@/domain/form-templates/repositories/FormTemplatesRepository";

type FormTemplatesResponse = {
  ok: boolean;
  items?: FormTemplate[];
  error?: string;
};

export class FormTemplatesRepositoryHttp implements FormTemplatesRepository {
  async getTemplates(): Promise<FormTemplate[]> {
    const res = await fetch("/api/form-templates");
    const data = (await res.json().catch(() => null)) as FormTemplatesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar las plantillas.");
    }

    return data.items ?? [];
  }

  async saveTemplate(input: {
    id?: string;
    name: string;
    description: string | null;
    fields?: TemplateField[];
  }): Promise<void> {
    const editing = Boolean(input.id);
    const payload: Record<string, unknown> = {
      name: input.name,
      description: input.description,
    };

    if (input.fields) {
      payload.fields = input.fields;
    }

    const res = await fetch(editing ? `/api/form-templates/${input.id}` : "/api/form-templates", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as FormTemplatesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar la plantilla.");
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const res = await fetch(`/api/form-templates/${templateId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as FormTemplatesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo eliminar la plantilla.");
    }
  }
}
