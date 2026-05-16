import { prisma } from "@/lib/prisma";
import { AppointmentStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AuditService } from "@/server/audit/AuditService";

const CONFLICT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

const APPOINTMENT_STATUSES = new Set<AppointmentStatus>(Object.values(AppointmentStatus));
const PAYMENT_STATUSES = new Set<PaymentStatus>(Object.values(PaymentStatus));

const appointmentInclude = {
  patient: true,
  doctor: { include: { profile: true } },
  box: true,
  treatmentPlan: {
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
      endsAt: true,
      _count: {
        select: {
          appointments: true,
        },
      },
      treatments: {
        select: {
          position: true,
          treatment: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  },
  paymentHistory: {
    include: {
      patientTreatment: {
        include: {
          treatment: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

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

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

function serializeAppointment(item: AppointmentWithRelations) {
  const { paymentHistory, treatmentPlan, ...appointment } = item;

  return {
    ...appointment,
    treatmentPlan: treatmentPlan
      ? {
          id: treatmentPlan.id,
          name: treatmentPlan.name,
          status: treatmentPlan.status,
          startsAt: treatmentPlan.startsAt,
          endsAt: treatmentPlan.endsAt,
          sessionIndex: appointment.planSessionIndex ?? null,
          totalSessions: treatmentPlan._count.appointments,
          treatments: treatmentPlan.treatments.map((entry) => ({
            id: entry.treatment.id,
            name: entry.treatment.name,
            price: toNumber(entry.treatment.price),
            position: entry.position,
          })),
        }
      : null,
    paymentEntry: paymentHistory
      ? {
          id: paymentHistory.id,
          recordedAt: paymentHistory.recordedAt,
          status: paymentHistory.status,
          amount: toNumber(paymentHistory.amount),
          notes: paymentHistory.notes,
          treatment: {
            id: paymentHistory.patientTreatment.treatment.id,
            name: paymentHistory.patientTreatment.treatment.name,
            price: toNumber(paymentHistory.patientTreatment.treatment.price),
          },
        }
      : null,
  };
}

export type AppointmentInput = {
  clinicId: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  treatmentPlanId?: string | null;
  planSessionIndex?: number | null;
  startAt: Date;
  endAt: Date;
  status?: string;
  paymentStatus?: string;
  notes?: string | null;
  createdBy?: string | null;
};

export type AppointmentPaymentInput = {
  clinicId: string;
  treatmentId: string;
  status: string;
  amount: number;
  notes?: string | null;
  performedAt?: Date | null;
  recordedAt?: Date | null;
};

export class AppointmentsService {
  static async list(params: {
    clinicId: string;
    from?: Date | null;
    to?: Date | null;
    doctorId?: string | null;
    patientId?: string | null;
    treatmentPlanId?: string | null;
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
    if (params.treatmentPlanId) where.treatmentPlanId = params.treatmentPlanId;
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

    const items = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    });

    return items.map((item) => serializeAppointment(item));
  }

  static async getById(params: { id: string; clinicId: string; doctorId?: string | null }) {
    const item = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        clinicId: params.clinicId,
        doctorId: params.doctorId ?? undefined,
      },
      include: appointmentInclude,
    });

    return item ? serializeAppointment(item) : null;
  }

  static async create(input: AppointmentInput) {
    await this.ensureRelated(input.clinicId, input.patientId, input.doctorId, input.boxId);
    if (input.treatmentPlanId) {
      await this.ensureTreatmentPlan({
        clinicId: input.clinicId,
        patientId: input.patientId,
        treatmentPlanId: input.treatmentPlanId,
      });
    }
    await this.assertNoConflicts(input);

    const item = await prisma.appointment.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        boxId: input.boxId,
        treatmentPlanId: input.treatmentPlanId ?? null,
        planSessionIndex:
          input.planSessionIndex !== null && input.planSessionIndex !== undefined
            ? Math.max(1, Math.trunc(input.planSessionIndex))
            : null,
        startAt: input.startAt,
        endAt: input.endAt,
        status: toAppointmentStatus(input.status) ?? "SCHEDULED",
        paymentStatus: toPaymentStatus(input.paymentStatus) ?? "PENDING",
        notes: input.notes ?? null,
        createdBy: input.createdBy ?? null,
      },
      include: appointmentInclude,
    });

    if (item.treatmentPlanId) {
      await this.syncTreatmentPlanStatus(item.treatmentPlanId);
    }

    return serializeAppointment(item);
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

    const item = await prisma.appointment.update({
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
      include: appointmentInclude,
    });

    if (item.treatmentPlanId) {
      await this.syncTreatmentPlanStatus(item.treatmentPlanId);
    }

    return serializeAppointment(item);
  }

  static async updatePayment(id: string, input: AppointmentPaymentInput) {
    const nextStatus = toPaymentStatus(input.status);
    if (!nextStatus) {
      throw new Error("Estado de pago invalido.");
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Monto invalido.");
    }

    const [appointment, treatment] = await Promise.all([
      prisma.appointment.findFirst({
        where: { id, clinicId: input.clinicId },
        include: appointmentInclude,
      }),
      prisma.treatment.findUnique({
        where: { id: input.treatmentId },
        select: { id: true },
      }),
    ]);

    if (!appointment) {
      throw new Error("Cita no encontrada.");
    }

    if (!treatment) {
      throw new Error("Tratamiento no encontrado.");
    }

    const recordedAt = input.recordedAt ?? new Date();
    const performedAt = input.performedAt ?? appointment.startAt;
    const currentPayment = appointment.paymentHistory;
    const shouldAutoCompleteAppointment =
      nextStatus === "PAID" &&
      appointment.startAt.getTime() <= recordedAt.getTime() &&
      (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED");

    const item = await prisma.$transaction(async (tx) => {
      if (currentPayment) {
        const nextRecordedAt =
          currentPayment.status !== "PAID" && nextStatus === "PAID"
            ? recordedAt
            : currentPayment.recordedAt;

        await tx.patientTreatment.update({
          where: { id: currentPayment.patientTreatmentId },
          data: {
            patientId: appointment.patientId,
            treatmentId: input.treatmentId,
            performedAt,
          },
        });

        return tx.appointment.update({
          where: { id },
          data: {
            paymentStatus: nextStatus,
            status: shouldAutoCompleteAppointment ? "COMPLETED" : undefined,
            paymentHistory: {
              update: {
                recordedAt: nextRecordedAt,
                status: nextStatus,
                amount: input.amount,
                notes: input.notes ?? null,
              },
            },
          },
          include: appointmentInclude,
        });
      }

      return tx.appointment.update({
        where: { id },
        data: {
          paymentStatus: nextStatus,
          status: shouldAutoCompleteAppointment ? "COMPLETED" : undefined,
          paymentHistory: {
            create: {
              recordedAt,
              status: nextStatus,
              amount: input.amount,
              notes: input.notes ?? null,
              patientTreatment: {
                create: {
                  patientId: appointment.patientId,
                  treatmentId: input.treatmentId,
                  performedAt,
                },
              },
            },
          },
        },
        include: appointmentInclude,
      });
    });

    if (item.treatmentPlanId) {
      await this.syncTreatmentPlanStatus(item.treatmentPlanId);
    }

    return serializeAppointment(item);
  }

  static async cancel(id: string, clinicId: string, author: string, detail?: string) {
    const current = await prisma.appointment.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Cita no encontrada.");
    }

    const item = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: appointmentInclude,
    });

    if (item.treatmentPlanId) {
      await this.syncTreatmentPlanStatus(item.treatmentPlanId);
    }

    await AuditService.log("appointment.cancel", author, detail);
    return serializeAppointment(item);
  }

  static async hardDelete(id: string, clinicId: string, author: string) {
    const current = await prisma.appointment.findFirst({
      where: { id, clinicId, status: "CANCELLED" },
      select: { id: true },
    });
    if (!current) {
      throw new Error("Solo se pueden eliminar citas canceladas.");
    }

    await prisma.appointment.delete({ where: { id } });
    await AuditService.log("appointment.delete", author, `Cita ${id} eliminada.`);
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

  private static async syncTreatmentPlanStatus(treatmentPlanId: string) {
    const sessions = await prisma.appointment.findMany({
      where: { treatmentPlanId },
      select: {
        status: true,
        endAt: true,
      },
      orderBy: { endAt: "asc" },
    });

    if (sessions.length === 0) return;

    const hasPendingSessions = sessions.some(
      (session) => session.status === "SCHEDULED" || session.status === "CONFIRMED"
    );

    const lastEndAt = sessions[sessions.length - 1]?.endAt ?? null;

    await prisma.treatmentPlan.update({
      where: { id: treatmentPlanId },
      data: {
        status: hasPendingSessions ? "ACTIVE" : "COMPLETED",
        endsAt: lastEndAt,
      },
    });
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

    if (!patient) throw new Error("Paciente no encontrado en la clinica.");
    if (!doctor) throw new Error("Doctor no encontrado en la clinica.");
    if (!box) throw new Error("Box no encontrado en la clinica.");
  }

  private static async ensureTreatmentPlan(input: {
    clinicId: string;
    patientId: string;
    treatmentPlanId: string;
  }) {
    const plan = await prisma.treatmentPlan.findFirst({
      where: {
        id: input.treatmentPlanId,
        clinicId: input.clinicId,
      },
      select: {
        patientId: true,
        status: true,
      },
    });

    if (!plan) {
      throw new Error("Plan de tratamiento no encontrado.");
    }

    if (plan.patientId !== input.patientId) {
      throw new Error("El plan de tratamiento no corresponde al paciente seleccionado.");
    }

    if (plan.status === "CANCELLED") {
      throw new Error("No se pueden agregar sesiones a un plan cancelado.");
    }
  }
}

