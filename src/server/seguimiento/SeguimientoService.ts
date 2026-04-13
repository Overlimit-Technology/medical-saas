import { prisma } from "@/lib/prisma";

export type SeguimientoItem = {
  id: string;
  treatmentId: string;
  treatmentName: string;
  patientId: string;
  patientName: string;
  performedAt: string;
  status: "in_progress" | "completed";
  notes: string | null;
  payments: {
    id: string;
    status: string;
    amount: number;
    recordedAt: string;
  }[];
};

export type SeguimientoStats = {
  total: number;
  inProgress: number;
  completed: number;
  pendingPayments: number;
};

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

export class SeguimientoService {
  static async list(clinicId: string): Promise<SeguimientoItem[]> {
    const items = await prisma.patientTreatment.findMany({
      where: {
        patient: { clinicId },
      },
      include: {
        treatment: { select: { id: true, name: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
        payments: {
          select: { id: true, status: true, amount: true, recordedAt: true },
          orderBy: { recordedAt: "desc" },
        },
      },
      orderBy: { performedAt: "desc" },
    });

    return items.map((item) => {
      const allPaid = item.payments.length > 0 && item.payments.every((p) => p.status === "PAID" || p.status === "WAIVED");
      return {
        id: item.id,
        treatmentId: item.treatment.id,
        treatmentName: item.treatment.name,
        patientId: item.patient.id,
        patientName: `${item.patient.firstName} ${item.patient.lastName}`,
        performedAt: item.performedAt.toISOString(),
        status: allPaid ? "completed" as const : "in_progress" as const,
        notes: null,
        payments: item.payments.map((p) => ({
          id: p.id,
          status: p.status,
          amount: toNumber(p.amount),
          recordedAt: p.recordedAt.toISOString(),
        })),
      };
    });
  }

  static async stats(clinicId: string): Promise<SeguimientoStats> {
    const items = await this.list(clinicId);
    const pendingPayments = items.filter(
      (i) => i.payments.some((p) => p.status === "PENDING")
    ).length;

    return {
      total: items.length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      completed: items.filter((i) => i.status === "completed").length,
      pendingPayments,
    };
  }
}
