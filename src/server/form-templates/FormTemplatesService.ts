import { prisma } from "@/lib/prisma";
import type { FormFieldType, TemplateType, Prisma } from "@prisma/client";

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
  templateType?: TemplateType;
  fields: FieldInput[];
};

type UpdateTemplateInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  fields?: FieldInput[];
};

type Actor = {
  userId: string;
  role: string;
};

const ADMIN_ONLY_TYPES: TemplateType[] = ["CONSENT", "ATTENDANCE_CERTIFICATE"];

function visibilityFilter(clinicId: string, actor: Actor, templateType?: TemplateType): Prisma.FormTemplateWhereInput {
  const typeFilter = templateType ? { templateType } : {};
  if (actor.role === "DOCTOR" && !templateType) {
    return {
      clinicId,
      ...typeFilter,
      OR: [
        { ownerDoctorId: actor.userId, templateType: "REPORT" },
        { ownerDoctorId: null, templateType: "REPORT" },
      ],
    };
  }
  if (actor.role === "DOCTOR" && templateType === "REPORT") {
    return {
      clinicId,
      templateType: "REPORT",
      OR: [{ ownerDoctorId: actor.userId }, { ownerDoctorId: null }],
    };
  }
  return { clinicId, ...typeFilter };
}

function canModify(template: { ownerDoctorId: string | null; templateType: TemplateType }, actor: Actor): boolean {
  if (actor.role === "ADMIN") return true;
  if (ADMIN_ONLY_TYPES.includes(template.templateType)) return false;
  if (actor.role === "DOCTOR") {
    return template.ownerDoctorId === actor.userId;
  }
  return false;
}

export class FormTemplatesService {
  static async list(clinicId: string, actor: Actor, templateType?: TemplateType) {
    return prisma.formTemplate.findMany({
      where: { ...visibilityFilter(clinicId, actor, templateType), isActive: true },
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

  static async create(clinicId: string, actor: Actor, input: CreateTemplateInput) {
    if (!input.name.trim()) throw new Error("El nombre es obligatorio.");
    if (!input.fields.length) throw new Error("Debe incluir al menos un campo.");

    const templateType: TemplateType = input.templateType ?? "REPORT";

    if (ADMIN_ONLY_TYPES.includes(templateType) && actor.role !== "ADMIN") {
      throw new Error("Solo los administradores pueden crear este tipo de plantilla.");
    }

    if (ADMIN_ONLY_TYPES.includes(templateType)) {
      const existing = await prisma.formTemplate.findFirst({
        where: { clinicId, templateType, isActive: true },
      });
      if (existing) {
        throw new Error("Ya existe una plantilla de este tipo para la clínica.");
      }
    }

    const ownerDoctorId = actor.role === "DOCTOR" && templateType === "REPORT" ? actor.userId : null;

    return prisma.formTemplate.create({
      data: {
        clinicId,
        ownerDoctorId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        templateType,
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

  static async update(id: string, clinicId: string, actor: Actor, input: UpdateTemplateInput) {
    const template = await prisma.formTemplate.findFirst({
      where: { id, clinicId },
      include: { _count: { select: { clinicalRecords: true } } },
    });
    if (!template) throw new Error("Plantilla no encontrada.");
    if (!canModify(template, actor)) throw new Error("No puedes modificar esta plantilla.");

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

  static async remove(id: string, clinicId: string, actor: Actor) {
    const template = await prisma.formTemplate.findFirst({
      where: { id, clinicId },
      include: { _count: { select: { clinicalRecords: true } } },
    });
    if (!template) throw new Error("Plantilla no encontrada.");
    if (!canModify(template, actor)) throw new Error("No puedes eliminar esta plantilla.");

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
