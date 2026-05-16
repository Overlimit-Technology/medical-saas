import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["PATIENTS", "CLINICAL_VISITS"]);

    const items = await prisma.patientTreatment.findMany({
      where: {
        patientId: params.id,
        patient: { clinicId: session.clinicId },
      },
      include: {
        treatment: { select: { id: true, name: true, price: true } },
        payments: {
          select: { id: true, status: true, amount: true, recordedAt: true },
          orderBy: { recordedAt: "asc" },
        },
      },
      orderBy: { performedAt: "desc" },
    });

    const result = items.map((item) => {
      const totalPayments = item.payments.length;
      const paidPayments = item.payments.filter(
        (p) => p.status === "PAID" || p.status === "WAIVED"
      ).length;
      const status =
        totalPayments > 0 && totalPayments === paidPayments
          ? ("completed" as const)
          : ("in_progress" as const);

      return {
        id: item.id,
        treatmentId: item.treatment.id,
        treatmentName: item.treatment.name,
        performedAt: item.performedAt.toISOString(),
        status,
        totalPayments,
        paidPayments,
        payments: item.payments.map((p) => ({
          id: p.id,
          status: p.status,
          amount: Number(p.amount.toString()),
          recordedAt: p.recordedAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({ ok: true, items: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar tratamientos";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
