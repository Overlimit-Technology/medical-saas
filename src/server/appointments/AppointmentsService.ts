import { prisma } from "@/lib/prisma";
import { AppointmentStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AuditService } from "@/server/audit/AuditService";

const CONFLICT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

const APPOINTMENT_STATUSES = new Set<AppointmentStatus>(Object.values(AppointmentStatus));
const PAYMENT_STATUSES = new Set<PaymentStatus>(Object.values(PaymentStatus));

function toAppointmentStatus(value?: string | null): AppointmentStatus | undefined {
  return value && APPOINTMENT_STATUSES.has(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : undefined;
}

function toPaymentStatus(value?: string | null): PaymentStatus | undefined {
  return value && PAYMENT_STATUSES.has(value as PaymentStatus)
    ? (value as PaymentStatus)
    : undefined;
}

export type AppointmentInput = {
  clinicId: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: Date;
  endAt: Date;
  status?: string;
  paymentStatus?: string;
  notes?: string | null;
  createdBy?: string | null;
};

export class AppointmentsService {
  static async list(params: {
    clinicId: string;
    from?: Date | null;
    to?: Date | null;
    doctorId?: string | null;
    patientId?: string | null;
    status?: string | null;
    q?: string | null;
  }) {
    const where: Prisma.AppointmentWhereInput = { clinicId: params.clinicId };

    if (params.from || params.to) {
      where.startAt = {};
      if (params.from) where.startAt.gte = params.from;
      if (params.to) where.startAt.lte = params.to;
    }

    if (params.doctorId) where.doctorId = params.doctorId;
    if (params.patientId) where.patientId = params.patientId;
    const status = toAppointmentStatus(params.status);
    if (status) where.status = status;

    if (params.q) {
      where.OR = [
        { patient: { firstName: { contains: params.q, mode: "insensitive" } } },
        { patient: { lastName: { contains: params.q, mode: "insensitive" } } },
        { doctor: { profile: { firstName: { contains: params.q, mode: "insensitive" } } } },
        { doctor: { profile: { lastName: { contains: params.q, mode: "insensitive" } } } },
      ];
    }

    return prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        box: true,
      },
      orderBy: { startAt: "asc" },
    });
  }

  static async create(input: AppointmentInput) {
    await this.ensureRelated(input.clinicId, input.patientId, input.doctorId, input.boxId);
    await this.assertNoConflicts(input);

    return prisma.appointment.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        boxId: input.boxId,
        startAt: input.startAt,
        endAt: input.endAt,
        status: toAppointmentStatus(input.status) ?? "SCHEDULED",
        paymentStatus: toPaymentStatus(input.paymentStatus) ?? "PENDING",
        notes: input.notes ?? null,
        createdBy: input.createdBy ?? null,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        box: true,
      },
    });
  }

  static async update(id: string, clinicId: string, input: Partial<AppointmentInput>) {
    const current = await prisma.appointment.findFirst({
      where: { id, clinicId },
    });
    if (!current) {
      throw new Error("Cita no encontrada.");
    }

    const next = {
      clinicId: current.clinicId,
      patientId: input.patientId ?? current.patientId,
      doctorId: input.doctorId ?? current.doctorId,
      boxId: input.boxId ?? current.boxId,
      startAt: input.startAt ?? current.startAt,
      endAt: input.endAt ?? current.endAt,
    };

    await this.ensureRelated(next.clinicId, next.patientId, next.doctorId, next.boxId);
    await this.assertNoConflicts({
      ...next,
      createdBy: input.createdBy ?? current.createdBy,
      status: input.status ?? current.status,
      paymentStatus: input.paymentStatus ?? current.paymentStatus,
      notes: input.notes ?? current.notes,
      excludeId: id,
    } as AppointmentInput & { excludeId: string });

    return prisma.appointment.update({
      where: { id },
      data: {
        patientId: input.patientId ?? undefined,
        doctorId: input.doctorId ?? undefined,
        boxId: input.boxId ?? undefined,
        startAt: input.startAt ?? undefined,
        endAt: input.endAt ?? undefined,
        status: toAppointmentStatus(input.status),
        paymentStatus: toPaymentStatus(input.paymentStatus),
        notes: input.notes ?? undefined,
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        box: true,
      },
    });
  }

  static async cancel(id: string, clinicId: string, author: string, detail?: string) {
    const current = await prisma.appointment.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Cita no encontrada.");
    }

    const item = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        box: true,
      },
    });

    await AuditService.log("appointment.cancel", author, detail);
    return item;
  }

  private static async assertNoConflicts(input: AppointmentInput & { excludeId?: string }) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinicId: input.clinicId,
        id: input.excludeId ? { not: input.excludeId } : undefined,
        status: { in: [...CONFLICT_STATUSES] },
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
        OR: [
          { doctorId: input.doctorId },
          { boxId: input.boxId },
          { patientId: input.patientId },
        ],
      },
      select: { id: true },
    });

    if (conflict) {
      throw new Error("Conflicto de cita.");
    }
  }

  private static async ensureRelated(clinicId: string, patientId: string, doctorId: string, boxId: string) {
    const [patient, doctor, box] = await Promise.all([
      prisma.patient.findFirst({ where: { id: patientId, clinicId } }),
      prisma.user.findFirst({
        where: {
          id: doctorId,
          role: "DOCTOR",
          clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
        },
      }),
      prisma.box.findFirst({ where: { id: boxId, clinicId, isActive: true } }),
    ]);

    if (!patient) throw new Error("Paciente no encontrado en la clínica.");
    if (!doctor) throw new Error("Doctor no encontrado en la clínica.");
    if (!box) throw new Error("Box no encontrado en la clínica.");
  }
}
