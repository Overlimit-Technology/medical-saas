import { prisma as db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ObservationStatus = "PRELIMINARY" | "FINAL" | "AMENDED" | "ENTERED_IN_ERROR";
type ObservationValueType = "STRING" | "QUANTITY" | "BOOLEAN";

export type ObservationInput = {
  clinicId: string;
  patientId: string;
  doctorId: string;
  clinicalVisitId?: string | null;
  status?: ObservationStatus;
  code: string;
  codeSystem: string;
  codeDisplay?: string | null;
  categoryCode?: string | null;
  categorySystem?: string | null;
  categoryDisplay?: string | null;
  valueType: ObservationValueType;
  valueString?: string | null;
  valueQuantity?: number | null;
  valueBoolean?: boolean | null;
  valueUnit?: string | null;
  effectiveAt?: Date | null;
  issuedAt?: Date | null;
  notes?: string | null;
};

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function assertValueByType(input: {
  valueType: ObservationValueType;
  valueString?: string | null;
  valueQuantity?: number | null;
  valueBoolean?: boolean | null;
}) {
  if (input.valueType === "STRING") {
    if (!clean(input.valueString)) {
      throw new Error("Observation valueString es obligatorio para valueType STRING.");
    }
    return;
  }

  if (input.valueType === "QUANTITY") {
    if (typeof input.valueQuantity !== "number" || !Number.isFinite(input.valueQuantity)) {
      throw new Error("Observation valueQuantity es obligatorio para valueType QUANTITY.");
    }
    return;
  }

  if (typeof input.valueBoolean !== "boolean") {
    throw new Error("Observation valueBoolean es obligatorio para valueType BOOLEAN.");
  }
}

export class ObservationsService {
  static async list(params: {
    clinicId: string;
    doctorId?: string | null;
    patientId?: string | null;
    clinicalVisitId?: string | null;
    code?: string | null;
    status?: ObservationStatus | null;
    from?: Date | null;
    to?: Date | null;
  }) {
    const where: Prisma.ObservationWhereInput = {
      clinicId: params.clinicId,
    };

    if (params.doctorId) where.doctorId = params.doctorId;
    if (params.patientId) where.patientId = params.patientId;
    if (params.clinicalVisitId) where.clinicalVisitId = params.clinicalVisitId;
    if (params.code) where.code = params.code;
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.effectiveAt = {};
      if (params.from) where.effectiveAt.gte = params.from;
      if (params.to) where.effectiveAt.lte = params.to;
    }

    return db.observation.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        clinicalVisit: true,
      },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getById(clinicId: string, id: string, doctorId?: string | null) {
    return db.observation.findFirst({
      where: {
        id,
        clinicId,
        doctorId: doctorId ?? undefined,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        clinicalVisit: true,
      },
    });
  }

  static async create(input: ObservationInput) {
    await this.ensureRelations(input.clinicId, input.patientId, input.doctorId, input.clinicalVisitId ?? null);
    assertValueByType(input);

    return db.observation.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        clinicalVisitId: input.clinicalVisitId ?? null,
        status: input.status ?? "FINAL",
        code: input.code,
        codeSystem: input.codeSystem,
        codeDisplay: clean(input.codeDisplay) ?? null,
        categoryCode: clean(input.categoryCode) ?? null,
        categorySystem: clean(input.categorySystem) ?? null,
        categoryDisplay: clean(input.categoryDisplay) ?? null,
        valueType: input.valueType,
        valueString: input.valueType === "STRING" ? clean(input.valueString) : null,
        valueQuantity: input.valueType === "QUANTITY" ? input.valueQuantity ?? null : null,
        valueBoolean: input.valueType === "BOOLEAN" ? input.valueBoolean ?? null : null,
        valueUnit: input.valueType === "QUANTITY" ? clean(input.valueUnit) ?? null : null,
        effectiveAt: input.effectiveAt ?? new Date(),
        issuedAt: input.issuedAt ?? new Date(),
        notes: clean(input.notes) ?? null,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        clinicalVisit: true,
      },
    });
  }

  static async update(id: string, clinicId: string, input: Partial<ObservationInput>) {
    const current = await db.observation.findFirst({
      where: { id, clinicId },
    });
    if (!current) {
      throw new Error("Observation no encontrada.");
    }

    const next: ObservationInput = {
      clinicId: current.clinicId,
      patientId: input.patientId ?? current.patientId,
      doctorId: input.doctorId ?? current.doctorId,
      clinicalVisitId: input.clinicalVisitId ?? current.clinicalVisitId,
      status: input.status ?? current.status,
      code: input.code ?? current.code,
      codeSystem: input.codeSystem ?? current.codeSystem,
      codeDisplay: input.codeDisplay ?? current.codeDisplay,
      categoryCode: input.categoryCode ?? current.categoryCode,
      categorySystem: input.categorySystem ?? current.categorySystem,
      categoryDisplay: input.categoryDisplay ?? current.categoryDisplay,
      valueType: input.valueType ?? current.valueType,
      valueString: input.valueString ?? current.valueString,
      valueQuantity: input.valueQuantity ?? current.valueQuantity,
      valueBoolean: input.valueBoolean ?? current.valueBoolean,
      valueUnit: input.valueUnit ?? current.valueUnit,
      effectiveAt: input.effectiveAt ?? current.effectiveAt,
      issuedAt: input.issuedAt ?? current.issuedAt,
      notes: input.notes ?? current.notes,
    };

    await this.ensureRelations(next.clinicId, next.patientId, next.doctorId, next.clinicalVisitId ?? null);
    assertValueByType(next);

    return db.observation.update({
      where: { id },
      data: {
        patientId: next.patientId,
        doctorId: next.doctorId,
        clinicalVisitId: next.clinicalVisitId ?? null,
        status: next.status,
        code: next.code,
        codeSystem: next.codeSystem,
        codeDisplay: clean(next.codeDisplay) ?? null,
        categoryCode: clean(next.categoryCode) ?? null,
        categorySystem: clean(next.categorySystem) ?? null,
        categoryDisplay: clean(next.categoryDisplay) ?? null,
        valueType: next.valueType,
        valueString: next.valueType === "STRING" ? clean(next.valueString) : null,
        valueQuantity: next.valueType === "QUANTITY" ? next.valueQuantity ?? null : null,
        valueBoolean: next.valueType === "BOOLEAN" ? next.valueBoolean ?? null : null,
        valueUnit: next.valueType === "QUANTITY" ? clean(next.valueUnit) ?? null : null,
        effectiveAt: next.effectiveAt ?? undefined,
        issuedAt: next.issuedAt ?? undefined,
        notes: clean(next.notes) ?? null,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        clinicalVisit: true,
      },
    });
  }

  private static async ensureRelations(
    clinicId: string,
    patientId: string,
    doctorId: string,
    clinicalVisitId: string | null
  ) {
    const [patient, doctor, clinicalVisit] = await Promise.all([
      db.patient.findFirst({
        where: {
          id: patientId,
          clinicId,
          isActive: true,
        },
      }),
      db.user.findFirst({
        where: {
          id: doctorId,
          role: "DOCTOR",
          clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
        },
      }),
      clinicalVisitId
        ? db.clinicalVisit.findFirst({
            where: {
              id: clinicalVisitId,
              clinicId,
              patientId,
              doctorId,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!patient) throw new Error("Paciente no encontrado en la clinica.");
    if (!doctor) throw new Error("Doctor no encontrado en la clinica.");
    if (clinicalVisitId && !clinicalVisit) {
      throw new Error("ClinicalVisit no encontrada para doctor/paciente en la clinica.");
    }
  }
}
