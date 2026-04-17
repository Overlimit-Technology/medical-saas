import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { VacationsService } from "@/server/vacations/VacationsService";

const statusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["approved", "rejected", "pending"]),
});

const limitSchema = z.object({
  userId: z.string().min(1),
  maxConsecutiveDays: z.number().int().min(1).max(60),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    const requests = await VacationsService.listByClinic(session.clinicId);
    const professionals = await VacationsService.listTeamWithLimits(session.clinicId);
    return NextResponse.json({ ok: true, requests, professionals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las vacaciones del equipo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    await VacationsService.updateStatus({
      clinicId: session.clinicId,
      requestId: parsed.data.requestId,
      status: parsed.data.status,
      reviewerId: session.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el estado.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");
    const body = await req.json();
    const parsed = limitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }
    await VacationsService.setMaxConsecutiveDays({
      clinicId: session.clinicId,
      adminUserId: session.userId,
      userId: parsed.data.userId,
      maxConsecutiveDays: parsed.data.maxConsecutiveDays,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el limite.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
