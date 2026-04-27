import { PaymentStatus, CashMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateCrmPaymentInput = {
  clinicId: string;
  patientId: string;
  treatmentId: string;
  recordedAt: Date;
  performedAt?: Date | null;
  amount?: number;
  status?: PaymentStatus;
  notes?: string | null;
};

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

export class CrmService {
  static async listTreatments() {
    const items = await prisma.treatment.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    return items.map((item) => ({
      ...item,
      price: toNumber(item.price),
    }));
  }

  static async listPaymentHistory(clinicId: string, patientId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        secondLastName: true,
        run: true,
      },
    });

    if (!patient) {
      throw new Error("Paciente no encontrado en la clinica.");
    }

    const rows = await prisma.paymentHistory.findMany({
      where: {
        patientTreatment: {
          patientId,
          patient: { clinicId },
        },
      },
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
      orderBy: { recordedAt: "desc" },
    });

    return {
      patient,
      items: rows.map((row) => ({
        id: row.id,
        recordedAt: row.recordedAt,
        performedAt: row.patientTreatment.performedAt,
        status: row.status,
        amount: toNumber(row.amount),
        notes: row.notes,
        treatment: {
          id: row.patientTreatment.treatment.id,
          name: row.patientTreatment.treatment.name,
          price: toNumber(row.patientTreatment.treatment.price),
        },
      })),
    };
  }

  static async getDailyCashSummary(clinicId: string, from: Date, to: Date) {
    const [paymentRows, movementRows] = await Promise.all([
      prisma.paymentHistory.findMany({
        where: {
          recordedAt: { gte: from, lt: to },
          patientTreatment: { patient: { clinicId } },
        },
        include: {
          patientTreatment: {
            include: {
              patient: {
                select: { firstName: true, lastName: true, secondLastName: true },
              },
              treatment: { select: { name: true } },
            },
          },
          appointment: {
            select: {
              createdByUser: {
                select: {
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { recordedAt: "desc" },
      }),
      prisma.cashMovement.findMany({
        where: {
          clinicId,
          recordedAt: { gte: from, lt: to },
        },
        include: {
          createdBy: {
            select: {
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    const paymentItems = paymentRows.map((row) => {
      const patientName = [
        row.patientTreatment.patient.firstName,
        row.patientTreatment.patient.lastName,
        row.patientTreatment.patient.secondLastName ?? "",
      ]
        .join(" ")
        .trim();

      const createdByProfile = row.appointment?.createdByUser?.profile;
      const userName = createdByProfile
        ? `${createdByProfile.firstName} ${createdByProfile.lastName}`.trim()
        : null;

      return {
        id: row.id,
        recordedAt: row.recordedAt,
        status: row.status as "PENDING" | "PAID" | "WAIVED",
        amount: toNumber(row.amount),
        notes: row.notes,
        patientName,
        treatmentName: row.patientTreatment.treatment.name,
        movementType: "PAYMENT" as const,
        userName,
      };
    });

    const cashItems = movementRows.map((row) => ({
      id: row.id,
      recordedAt: row.recordedAt,
      status: "PAID" as const,
      amount: row.type === "EXPENSE" ? -toNumber(row.amount) : toNumber(row.amount),
      notes: row.description,
      patientName: "",
      treatmentName: "",
      movementType: row.type as "INCOME" | "EXPENSE",
      userName: row.createdBy.profile
        ? `${row.createdBy.profile.firstName} ${row.createdBy.profile.lastName}`.trim()
        : null,
    }));

    const items = [...paymentItems, ...cashItems].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    const totalIncome = items
      .filter((i) => i.amount > 0)
      .reduce((s, i) => s + i.amount, 0);
    const totalExpense = items
      .filter((i) => i.amount < 0)
      .reduce((s, i) => s + Math.abs(i.amount), 0);

    const summary = {
      totalAmount: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      totalCount: items.length,
      paidCount: paymentItems.filter((i) => i.status === "PAID").length,
      pendingCount: paymentItems.filter((i) => i.status === "PENDING").length,
      waivedCount: paymentItems.filter((i) => i.status === "WAIVED").length,
    };

    return { summary, items };
  }

  static async createPaymentEntry(input: CreateCrmPaymentInput) {
    const [patient, treatment] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: input.patientId, clinicId: input.clinicId, isActive: true },
        select: { id: true },
      }),
      prisma.treatment.findUnique({
        where: { id: input.treatmentId },
        select: { id: true, name: true, price: true },
      }),
    ]);

    if (!patient) {
      throw new Error("Paciente no encontrado en la clinica.");
    }
    if (!treatment) {
      throw new Error("Tratamiento no encontrado.");
    }

    const amount = input.amount ?? toNumber(treatment.price);

    const payment = await prisma.$transaction(async (tx) => {
      const patientTreatment = await tx.patientTreatment.create({
        data: {
          patientId: input.patientId,
          treatmentId: input.treatmentId,
          performedAt: input.performedAt ?? input.recordedAt,
        },
      });

      return tx.paymentHistory.create({
        data: {
          patientTreatmentId: patientTreatment.id,
          recordedAt: input.recordedAt,
          status: input.status ?? "PENDING",
          amount,
          notes: input.notes ?? null,
        },
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
      });
    });

    return {
      id: payment.id,
      recordedAt: payment.recordedAt,
      performedAt: payment.patientTreatment.performedAt,
      status: payment.status,
      amount: toNumber(payment.amount),
      notes: payment.notes,
      treatment: {
        id: payment.patientTreatment.treatment.id,
        name: payment.patientTreatment.treatment.name,
        price: toNumber(payment.patientTreatment.treatment.price),
      },
    };
  }

  static async createCashMovement(input: {
    clinicId: string;
    createdById: string;
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
  }) {
    if (!input.description.trim()) {
      throw new Error("La descripcion es obligatoria.");
    }
    if (input.amount <= 0) {
      throw new Error("El monto debe ser mayor a 0.");
    }

    const row = await prisma.cashMovement.create({
      data: {
        clinicId: input.clinicId,
        createdById: input.createdById,
        type: input.type as CashMovementType,
        description: input.description.trim(),
        amount: input.amount,
        recordedAt: new Date(),
      },
    });

    return {
      id: row.id,
      type: row.type,
      description: row.description,
      amount: toNumber(row.amount),
      recordedAt: row.recordedAt,
    };
  }
}
