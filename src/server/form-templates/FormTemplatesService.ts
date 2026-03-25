import { prisma } from "@/lib/prisma";
import type { FormFieldType } from "@prisma/client";

type FieldInput = {
  label: string;
  fieldType: FormFieldType;
  position: number;
  isRequired: boolean;
  options?: string | null;
  defaultValue?: string | null;
};

type CreateTemplateInput = {
  name: string;
  description?: string | null;
  fields: FieldInput[];
};

type UpdateTemplateInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  fields?: FieldInput[];
};

export class FormTemplatesService {
  static async list(clinicId: string) {
    return prisma.formTemplate.findMany({
      where: { clinicId, isActive: true },
      include: {
        fields: { orderBy: { position: "asc" } },
        _count: { select: { clinicalRecords: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  static async getById(id: string, clinicId: string) {
    const template = await prisma.formTemplate.findFirst({
      where: { id, clinicId },
      include: {
        fields: { orderBy: { position: "asc" } },
        _count: { select: { clinicalRecords: true } },
      },
    });
    if (!template) throw new Error("Plantilla no encontrada.");
    return template;
  }

  static async create(clinicId: string, input: CreateTemplateInput) {
    if (!input.name.trim()) throw new Error("El nombre es obligatorio.");
    if (!input.fields.length) throw new Error("Debe incluir al menos un campo.");

    return prisma.formTemplate.create({
      data: {
        clinicId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        fields: {
          create: input.fields.map((f, idx) => ({
            label: f.label.trim(),
            fieldType: f.fieldType,
            position: f.position ?? idx,
            isRequired: f.isRequired ?? false,
            options: f.options || null,
            defaultValue: f.defaultValue || null,
          })),
        },
      },
      include: {
        fields: { orderBy: { position: "asc" } },
      },
    });
  }

  static async update(id: string, clinicId: string, input: UpdateTemplateInput) {
    const template = await prisma.formTemplate.findFirst({
      where: { id, clinicId },
      include: { _count: { select: { clinicalRecords: true } } },
    });
    if (!template) throw new Error("Plantilla no encontrada.");

    const hasRecords = template._count.clinicalRecords > 0;

    if (hasRecords) {
      return prisma.formTemplate.update({
        where: { id },
        data: {
          name: input.name?.trim() ?? template.name,
          description: input.description !== undefined ? (input.description?.trim() || null) : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
        },
        include: {
          fields: { orderBy: { position: "asc" } },
          _count: { select: { clinicalRecords: true } },
        },
      });
    }

    return prisma.$transaction(async (tx) => {
      if (input.fields) {
        await tx.formTemplateField.deleteMany({ where: { templateId: id } });
      }

      return tx.formTemplate.update({
        where: { id },
        data: {
          name: input.name?.trim() ?? template.name,
          description: input.description !== undefined ? (input.description?.trim() || null) : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
          ...(input.fields
            ? {
                fields: {
                  create: input.fields.map((f, idx) => ({
                    label: f.label.trim(),
                    fieldType: f.fieldType,
                    position: f.position ?? idx,
                    isRequired: f.isRequired ?? false,
                    options: f.options || null,
                    defaultValue: f.defaultValue || null,
                  })),
                },
              }
            : {}),
        },
        include: {
          fields: { orderBy: { position: "asc" } },
          _count: { select: { clinicalRecords: true } },
        },
      });
    });
  }

  static async remove(id: string, clinicId: string) {
    const template = await prisma.formTemplate.findFirst({
      where: { id, clinicId },
      include: { _count: { select: { clinicalRecords: true } } },
    });
    if (!template) throw new Error("Plantilla no encontrada.");

    if (template._count.clinicalRecords > 0) {
      await prisma.formTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return;
    }

    await prisma.formTemplate.delete({ where: { id } });
  }
}
