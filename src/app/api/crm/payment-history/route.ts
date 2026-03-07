import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { CrmService } from "@/server/crm/CrmService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/notifications/email";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";

const paymentCreateSchema = z.object({
  patientId: z.string().min(1),
  treatmentId: z.string().min(1),
  recordedAt: z.string().optional(),
  performedAt: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "WAIVED"]).optional(),
  amount: z.coerce.number().positive().optional(),
  notes: z.string().max(250).optional().nullable(),
});

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

const PAYMENT_STATUS_LABEL: Record<"PENDING" | "PAID" | "WAIVED", string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  WAIVED: "Exento",
};

function statusToLabel(status: unknown) {
  if (status === "PENDING") return PAYMENT_STATUS_LABEL.PENDING;
  if (status === "PAID") return PAYMENT_STATUS_LABEL.PAID;
  if (status === "WAIVED") return PAYMENT_STATUS_LABEL.WAIVED;
  return "Desconocido";
}

function formatClp(value: number) {
  return `${new Intl.NumberFormat("es-CL").format(Math.round(value))} CLP`;
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ ok: false, error: "El paciente es obligatorio." }, { status: 400 });
    }

    const data = await CrmService.listPaymentHistory(session.clinicId, patientId);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el historial de pagos.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = paymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const recordedAt = parsed.data.recordedAt ? parseDate(parsed.data.recordedAt) : new Date();
    if (!recordedAt) {
      return NextResponse.json({ ok: false, error: "La fecha de registro es invalida." }, { status: 400 });
    }

    const performedAt = parsed.data.performedAt ? parseDate(parsed.data.performedAt) : null;
    if (parsed.data.performedAt && !performedAt) {
      return NextResponse.json({ ok: false, error: "La fecha de realizacion es invalida." }, { status: 400 });
    }

    const item = await CrmService.createPaymentEntry({
      clinicId: session.clinicId,
      patientId: parsed.data.patientId,
      treatmentId: parsed.data.treatmentId,
      recordedAt,
      performedAt,
      status: parsed.data.status,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    });

    let notificationWarning: string | null = null;
    const patient = await prisma.patient.findFirst({
      where: {
        id: parsed.data.patientId,
        clinicId: session.clinicId,
        isActive: true,
      },
      select: {
        firstName: true,
        lastName: true,
        secondLastName: true,
        email: true,
      },
    });

    if (patient?.email) {
      const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
      const patientName = [patient.firstName, patient.lastName, patient.secondLastName ?? ""]
        .join(" ")
        .trim();
      const subject = "Actualizacion de pago en ZENSYA";
      const text = [
        `Hola ${patientName || patient.firstName},`,
        "",
        "Se registro una actualizacion de cobro/pago en ZENSYA.",
        `Tratamiento: ${item.treatment.name}`,
        `Monto: ${formatClp(item.amount)}`,
        `Estado: ${statusToLabel(item.status)}`,
        `Sede: ${clinicLabel}`,
        "",
        "Si tienes dudas, contacta a la clinica.",
      ].join("\n");

      const origin = new URL(req.url).origin;
      const sent = await sendEmail({
        origin,
        to: patient.email,
        subject,
        text,
      });
      if (!sent.ok) {
        notificationWarning = sent.error;
      }
    }

    const patientName = patient
      ? [patient.firstName, patient.lastName, patient.secondLastName ?? ""].join(" ").trim()
      : "Paciente no disponible";
    let internalAlertWarning: string | null = null;

    try {
      const alert = await InternalAlertsService.createAndDispatch({
        origin: new URL(req.url).origin,
        clinicId: session.clinicId,
        actorUserId: session.userId,
        actorRole: session.role,
        eventType: item.status === "PENDING" ? "PAYMENT_PENDING" : "CUSTOM",
        title: item.status === "PENDING" ? "Cobro/Pago pendiente" : "Actualizacion de cobro/pago",
        message: `Paciente: ${patientName}. Tratamiento: ${item.treatment.name}. Estado: ${statusToLabel(item.status)}. Monto: ${formatClp(item.amount)}.`,
        referenceType: "PAYMENT_HISTORY",
        referenceId: item.id,
      });
      internalAlertWarning = alert.warning;
    } catch (error) {
      internalAlertWarning = error instanceof Error ? error.message : "No se pudo generar la alerta interna.";
    }

    return NextResponse.json({ ok: true, item, notificationWarning, internalAlertWarning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el historial de pago.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
