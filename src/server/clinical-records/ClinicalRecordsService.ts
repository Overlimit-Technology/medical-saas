import { prisma } from "@/lib/prisma";

type ValueInput = {
  fieldId: string;
  value: string;
};

type CreateRecordInput = {
  appointmentId?: string | null;
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
        template: { select: { id: true, name: true, includeLogo: true } },
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

  static async listByPatient(clinicId: string, patientId: string) {
    return prisma.clinicalRecord.findMany({
      where: { clinicId, patientId },
      include: {
        template: { select: { id: true, name: true, includeLogo: true } },
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
    const appointmentId = input.appointmentId ?? null;

    const appointment = appointmentId
      ? await prisma.appointment.findFirst({
          where: { id: appointmentId, clinicId },
        })
      : null;

    if (appointmentId && !appointment) throw new Error("Cita no encontrada.");

    const template = await prisma.formTemplate.findFirst({
      where: {
        id: input.templateId,
        clinicId,
        isActive: true,
        OR: [{ ownerDoctorId: doctorId }, { ownerDoctorId: null }],
      },
      include: { fields: true },
    });
    if (!template) throw new Error("Plantilla no encontrada o inactiva.");

    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId },
    });
    if (!patient) throw new Error("Paciente no encontrado.");

    const doctor = await prisma.user.findFirst({
      where: { id: doctorId },
      include: { profile: true },
    });

    const clinic = await prisma.clinic.findFirst({ where: { id: clinicId } });

    const valuesMap = new Map(input.values.map((v) => [v.fieldId, v.value]));

    for (const field of template.fields) {
      if (field.fieldType === "VARIABLE") {
        const variableKey = field.options ?? "";
        const autoValue = resolveVariable(variableKey, { patient, doctor, appointment, clinic });
        valuesMap.set(field.id, autoValue);
      }
      if (field.fieldType === "SIGNATURE" && !valuesMap.has(field.id)) {
        valuesMap.set(field.id, "");
      }
    }

    const fieldMap = new Map(template.fields.map((f) => [f.id, f]));
    for (const field of template.fields) {
      if (field.isRequired && field.fieldType !== "VARIABLE" && field.fieldType !== "SIGNATURE") {
        const val = valuesMap.get(field.id);
        if (!val || !val.trim()) {
          throw new Error(`El campo "${field.label}" es obligatorio.`);
        }
      }
    }

    for (const fieldId of Array.from(valuesMap.keys())) {
      if (!fieldMap.has(fieldId)) {
        throw new Error(`Campo "${fieldId}" no pertenece a la plantilla.`);
      }
    }

    const valuesToSave = Array.from(valuesMap.entries())
      .filter(([, value]) => value.trim() !== "")
      .map(([fieldId, value]) => ({ fieldId, value }));

    return prisma.clinicalRecord.create({
      data: {
        clinicId,
        appointmentId,
        templateId: input.templateId,
        patientId: input.patientId,
        doctorId,
        values: {
          create: valuesToSave,
        },
      },
      include: {
        template: { select: { id: true, name: true, includeLogo: true } },
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
          template: { select: { id: true, name: true, includeLogo: true } },
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

type ResolveContext = {
  patient: { firstName: string; lastName: string; run?: string | null } | null;
  doctor: { profile: { firstName: string; lastName: string } | null } | null;
  appointment: {
    startAt?: Date;
    notes?: string | null;
  } | null;
  clinic: { name: string } | null;
};

function resolveVariable(key: string, ctx: ResolveContext): string {
  const { patient, doctor, appointment, clinic } = ctx;
  switch (key) {
    case "patient_full_name":
      return patient ? `${patient.firstName} ${patient.lastName}`.trim() : "";
    case "patient_rut":
      return patient?.run ?? "";
    case "doctor_full_name":
      return doctor?.profile ? `${doctor.profile.firstName} ${doctor.profile.lastName}`.trim() : "";
    case "doctor_specialty":
      return "";
    case "appointment_date":
      return appointment?.startAt
        ? appointment.startAt.toLocaleDateString("es-CL")
        : "";
    case "appointment_time":
      return appointment?.startAt
        ? appointment.startAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
        : "";
    case "clinic_name":
      return clinic?.name ?? "";
    case "treatment":
      return appointment?.notes ?? "";
    default:
      return "";
  }
}
