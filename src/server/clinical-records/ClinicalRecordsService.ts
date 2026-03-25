import { prisma } from "@/lib/prisma";

type ValueInput = {
  fieldId: string;
  value: string;
};

type CreateRecordInput = {
  appointmentId: string;
  templateId: string;
  patientId: string;
  values: ValueInput[];
};

type UpdateRecordInput = {
  values: ValueInput[];
};

export class ClinicalRecordsService {
  static async listByAppointment(clinicId: string, appointmentId: string) {
    return prisma.clinicalRecord.findMany({
      where: { clinicId, appointmentId },
      include: {
        template: { select: { id: true, name: true } },
        doctor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        values: {
          include: {
            field: {
              select: { id: true, label: true, fieldType: true, position: true, isRequired: true, options: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(id: string, clinicId: string) {
    const record = await prisma.clinicalRecord.findFirst({
      where: { id, clinicId },
      include: {
        template: {
          include: { fields: { orderBy: { position: "asc" } } },
        },
        patient: { select: { id: true, firstName: true, lastName: true, run: true } },
        doctor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        values: {
          include: {
            field: { select: { id: true, label: true, fieldType: true, position: true } },
          },
        },
      },
    });
    if (!record) throw new Error("Ficha clínica no encontrada.");
    return record;
  }

  static async create(clinicId: string, doctorId: string, input: CreateRecordInput) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, clinicId },
    });
    if (!appointment) throw new Error("Cita no encontrada.");

    const template = await prisma.formTemplate.findFirst({
      where: { id: input.templateId, clinicId, isActive: true },
      include: { fields: true },
    });
    if (!template) throw new Error("Plantilla no encontrada o inactiva.");

    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId },
    });
    if (!patient) throw new Error("Paciente no encontrado.");

    const fieldMap = new Map(template.fields.map((f) => [f.id, f]));
    for (const field of template.fields) {
      if (field.isRequired) {
        const val = input.values.find((v) => v.fieldId === field.id);
        if (!val || !val.value.trim()) {
          throw new Error(`El campo "${field.label}" es obligatorio.`);
        }
      }
    }

    for (const val of input.values) {
      if (!fieldMap.has(val.fieldId)) {
        throw new Error(`Campo "${val.fieldId}" no pertenece a la plantilla.`);
      }
    }

    return prisma.clinicalRecord.create({
      data: {
        clinicId,
        appointmentId: input.appointmentId,
        templateId: input.templateId,
        patientId: input.patientId,
        doctorId,
        values: {
          create: input.values
            .filter((v) => v.value.trim())
            .map((v) => ({
              fieldId: v.fieldId,
              value: v.value,
            })),
        },
      },
      include: {
        template: { select: { id: true, name: true } },
        values: {
          include: {
            field: { select: { id: true, label: true, fieldType: true, position: true } },
          },
        },
      },
    });
  }

  static async update(id: string, clinicId: string, doctorId: string, input: UpdateRecordInput) {
    const record = await prisma.clinicalRecord.findFirst({
      where: { id, clinicId },
    });
    if (!record) throw new Error("Ficha clínica no encontrada.");

    return prisma.$transaction(async (tx) => {
      await tx.clinicalRecordValue.deleteMany({
        where: { clinicalRecordId: id },
      });

      return tx.clinicalRecord.update({
        where: { id },
        data: {
          values: {
            create: input.values
              .filter((v) => v.value.trim())
              .map((v) => ({
                fieldId: v.fieldId,
                value: v.value,
              })),
          },
        },
        include: {
          template: { select: { id: true, name: true } },
          values: {
            include: {
              field: { select: { id: true, label: true, fieldType: true, position: true } },
            },
          },
        },
      });
    });
  }
}
