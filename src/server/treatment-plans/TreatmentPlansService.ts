import { prisma } from "@/lib/prisma";
import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  TreatmentPlanStatus,
} from "@prisma/client";

const CONFLICT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;
const APPOINTMENT_STATUSES = new Set<AppointmentStatus>(Object.values(AppointmentStatus));
const PAYMENT_STATUSES = new Set<PaymentStatus>(Object.values(PaymentStatus));
const PLAN_STATUSES = new Set<TreatmentPlanStatus>(Object.values(TreatmentPlanStatus));

const planInclude = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      secondLastName: true,
      run: true,
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
  appointments: {
    select: {
      id: true,
      doctorId: true,
      boxId: true,
      startAt: true,
      endAt: true,
      status: true,
      paymentStatus: true,
      notes: true,
      planSessionIndex: true,
      doctor: {
        select: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      box: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { startAt: "asc" },
  },
} satisfies Prisma.TreatmentPlanInclude;

type TreatmentPlanWithRelations = Prisma.TreatmentPlanGetPayload<{
  include: typeof planInclude;
}>;

export type CreateContinuousTreatmentPlanInput = {
  clinicId: string;
  patientId: string;
  createdBy?: string | null;
  name: string;
  notes?: string | null;
  treatmentIds: string[];
  doctorId: string;
  boxId: string;
  firstSessionStartAt: Date;
  firstSessionEndAt: Date;
  totalSessions: number;
  frequencyDays: number;
  appointmentNotes?: string | null;
  appointmentStatus?: string | null;
  paymentStatus?: string | null;
};

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

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

function toPlanStatus(value?: string | null): TreatmentPlanStatus | undefined {
  return value && PLAN_STATUSES.has(value as TreatmentPlanStatus)
    ? (value as TreatmentPlanStatus)
    : undefined;
}

function buildPatientFullName(input: {
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
}) {
  return [input.firstName, input.lastName, input.secondLastName ?? ""].join(" ").trim();
}

function serializePlan(item: TreatmentPlanWithRelations) {
  const sessionCounters = {
    total: item.appointments.length,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  };

  let nextSessionAt: Date | null = null;

  for (const session of item.appointments) {
    if (session.status === "SCHEDULED") {
      sessionCounters.scheduled += 1;
    } else if (session.status === "CONFIRMED") {
      sessionCounters.confirmed += 1;
    } else if (session.status === "COMPLETED") {
      sessionCounters.completed += 1;
    } else if (session.status === "CANCELLED") {
      sessionCounters.cancelled += 1;
    } else if (session.status === "NO_SHOW") {
      sessionCounters.noShow += 1;
    }

    if (
      (session.status === "SCHEDULED" || session.status === "CONFIRMED") &&
      (!nextSessionAt || session.startAt.getTime() < nextSessionAt.getTime())
    ) {
      nextSessionAt = session.startAt;
    }
  }

  return {
    id: item.id,
    clinicId: item.clinicId,
    patientId: item.patientId,
    createdBy: item.createdBy,
    name: item.name,
    notes: item.notes,
    status: item.status,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    patient: {
      ...item.patient,
      fullName: buildPatientFullName(item.patient),
    },
    treatments: item.treatments.map((entry) => ({
      id: entry.treatment.id,
      name: entry.treatment.name,
      price: toNumber(entry.treatment.price),
      position: entry.position,
    })),
    sessions: {
      ...sessionCounters,
      nextSessionAt,
    },
    appointments: item.appointments.map((session) => ({
      id: session.id,
      doctorId: session.doctorId,
      boxId: session.boxId,
      startAt: session.startAt,
      endAt: session.endAt,
      status: session.status,
      paymentStatus: session.paymentStatus,
      notes: session.notes,
      sessionIndex: session.planSessionIndex,
      doctor: session.doctor,
      box: session.box,
    })),
  };
}

export class TreatmentPlansService {
  static async list(params: {
    clinicId: string;
    patientId?: string | null;
    status?: string | null;
    from?: Date | null;
    to?: Date | null;
  }) {
    const where: Prisma.TreatmentPlanWhereInput = {
      clinicId: params.clinicId,
    };

    if (params.patientId) where.patientId = params.patientId;
    if (params.from || params.to) {
      where.startsAt = {};
      if (params.from) where.startsAt.gte = params.from;
      if (params.to) where.startsAt.lte = params.to;
    }

    const status = toPlanStatus(params.status);
    if (status) where.status = status;

    const items = await prisma.treatmentPlan.findMany({
      where,
      include: planInclude,
      orderBy: { startsAt: "desc" },
    });

    return items.map((item) => serializePlan(item));
  }

  static async getById(params: { clinicId: string; id: string }) {
    const item = await prisma.treatmentPlan.findFirst({
      where: {
        clinicId: params.clinicId,
        id: params.id,
      },
      include: planInclude,
    });

    return item ? serializePlan(item) : null;
  }

  static async createContinuous(input: CreateContinuousTreatmentPlanInput) {
    const normalizedName = input.name.trim();
    if (!normalizedName) throw new Error("El nombre del plan es obligatorio.");

    if (!Number.isInteger(input.totalSessions) || input.totalSessions < 1) {
      throw new Error("La cantidad de sesiones debe ser un entero mayor o igual a 1.");
    }

    if (input.totalSessions > 90) {
      throw new Error("No se pueden crear mas de 90 sesiones en un solo plan.");
    }

    if (!Number.isInteger(input.frequencyDays) || input.frequencyDays < 1) {
      throw new Error("La frecuencia de dias debe ser un entero mayor o igual a 1.");
    }

    if (input.frequencyDays > 60) {
      throw new Error("La frecuencia de dias no puede superar 60.");
    }

    const durationMs = input.firstSessionEndAt.getTime() - input.firstSessionStartAt.getTime();
    if (durationMs <= 0) {
      throw new Error("El rango horario de la primera sesion es invalido.");
    }

    const treatmentIds = Array.from(new Set(input.treatmentIds.map((id) => id.trim()).filter(Boolean)));
    if (treatmentIds.length === 0) {
      throw new Error("Debes seleccionar al menos un tratamiento para el plan.");
    }

    const appointmentStatus = toAppointmentStatus(input.appointmentStatus) ?? "SCHEDULED";
    const paymentStatus = toPaymentStatus(input.paymentStatus) ?? "PENDING";

    const startsAt = input.firstSessionStartAt;
    const endsAt = new Date(input.firstSessionEndAt.getTime() + (input.totalSessions - 1) * input.frequencyDays * 86400000);

    const createdPlan = await prisma.$transaction(async (tx) => {
      const [patient, doctor, box, treatments] = await Promise.all([
        tx.patient.findFirst({
          where: {
            id: input.patientId,
            clinicId: input.clinicId,
          },
          select: { id: true },
        }),
        tx.user.findFirst({
          where: {
            id: input.doctorId,
            role: "DOCTOR",
            clinicMemberships: { some: { clinicId: input.clinicId, status: "ACTIVE" } },
          },
          select: { id: true },
        }),
        tx.box.findFirst({
          where: {
            id: input.boxId,
            clinicId: input.clinicId,
            isActive: true,
          },
          select: { id: true },
        }),
        tx.treatment.findMany({
          where: { id: { in: treatmentIds } },
          select: { id: true },
        }),
      ]);

      if (!patient) throw new Error("Paciente no encontrado en la clinica.");
      if (!doctor) throw new Error("Doctor no encontrado en la clinica.");
      if (!box) throw new Error("Box no encontrado en la clinica.");
      if (treatments.length !== treatmentIds.length) {
        throw new Error("Uno o mas tratamientos no existen.");
      }

      const plan = await tx.treatmentPlan.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.patientId,
          createdBy: input.createdBy ?? null,
          name: normalizedName,
          notes: input.notes?.trim() || null,
          startsAt,
          endsAt,
          status:
            appointmentStatus === "SCHEDULED" || appointmentStatus === "CONFIRMED"
              ? "ACTIVE"
              : "COMPLETED",
        },
      });

      await tx.treatmentPlanTreatment.createMany({
        data: treatmentIds.map((treatmentId, index) => ({
          planId: plan.id,
          treatmentId,
          position: index,
        })),
      });

      for (let sessionIndex = 0; sessionIndex < input.totalSessions; sessionIndex += 1) {
        const offsetMs = sessionIndex * input.frequencyDays * 86400000;
        const sessionStart = new Date(input.firstSessionStartAt.getTime() + offsetMs);
        const sessionEnd = new Date(sessionStart.getTime() + durationMs);

        const conflict = await tx.appointment.findFirst({
          where: {
            clinicId: input.clinicId,
            status: { in: [...CONFLICT_STATUSES] },
            startAt: { lt: sessionEnd },
            endAt: { gt: sessionStart },
            OR: [
              { doctorId: input.doctorId },
              { boxId: input.boxId },
              { patientId: input.patientId },
            ],
          },
          select: { id: true },
        });

        if (conflict) {
          throw new Error(
            `Conflicto de agenda en la sesion ${sessionIndex + 1}. Ajusta horario, box o profesional.`
          );
        }

        await tx.appointment.create({
          data: {
            clinicId: input.clinicId,
            patientId: input.patientId,
            doctorId: input.doctorId,
            boxId: input.boxId,
            treatmentPlanId: plan.id,
            planSessionIndex: sessionIndex + 1,
            startAt: sessionStart,
            endAt: sessionEnd,
            status: appointmentStatus,
            paymentStatus,
            notes: input.appointmentNotes ?? null,
            createdBy: input.createdBy ?? null,
          },
        });
      }

      return plan;
    });

    const savedPlan = await this.getById({
      clinicId: input.clinicId,
      id: createdPlan.id,
    });

    if (!savedPlan) {
      throw new Error("No se pudo recuperar el plan de tratamiento recien creado.");
    }

    return savedPlan;
  }
}
