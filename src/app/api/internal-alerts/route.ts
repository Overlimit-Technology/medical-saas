import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";

const createInternalAlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  doctorId: z.string().min(1).optional().nullable(),
  eventType: z
    .enum([
      "APPOINTMENT_CREATED",
      "APPOINTMENT_RESCHEDULED",
      "APPOINTMENT_CANCELLED",
      "APPOINTMENT_CONFLICT",
      "PAYMENT_PENDING",
      "CUSTOM",
    ])
    .optional(),
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().max(120).optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    const items = await InternalAlertsService.listForUser(session.userId);
    const unreadCount = items.filter((item) => !item.isRead).length;
    return NextResponse.json({ ok: true, items, unreadCount });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar las alertas internas." },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = createInternalAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const result = await InternalAlertsService.createAndDispatch({
      origin: new URL(req.url).origin,
      clinicId: session.clinicId,
      actorUserId: session.userId,
      actorRole: session.role,
      title: parsed.data.title,
      message: parsed.data.message,
      doctorId: parsed.data.doctorId ?? null,
      eventType: parsed.data.eventType,
      referenceType: parsed.data.referenceType ?? null,
      referenceId: parsed.data.referenceId ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        alertId: result.alertId,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        warning: result.warning,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la alerta interna.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
