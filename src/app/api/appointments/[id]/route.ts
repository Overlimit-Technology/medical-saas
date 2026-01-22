import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";

const appointmentUpdateSchema = z.object({
  patientId: z.string().min(1).optional(),
  doctorId: z.string().min(1).optional(),
  boxId: z.string().min(1).optional(),
  startAt: z.string().min(1).optional(),
  endAt: z.string().min(1).optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
});

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const data: any = { ...parsed.data };
    if (parsed.data.startAt) data.startAt = parseDate(parsed.data.startAt);
    if (parsed.data.endAt) data.endAt = parseDate(parsed.data.endAt);

    if ((parsed.data.startAt && !data.startAt) || (parsed.data.endAt && !data.endAt)) {
      return NextResponse.json({ ok: false, error: "Invalid time range" }, { status: 400 });
    }

    const item = await AppointmentsService.update(params.id, session.clinicId, {
      ...data,
      createdBy: session.userId,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update appointment";
    const status = message.includes("conflict") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    const item = await AppointmentsService.cancel(params.id, session.clinicId, session.userId, reason);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel appointment";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
