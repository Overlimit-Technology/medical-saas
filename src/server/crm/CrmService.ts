import { PaymentStatus } from "@prisma/client";
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
}
