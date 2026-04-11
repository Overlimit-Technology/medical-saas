import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireClinicSession,
  requireRole,
} from "@/server/auth/requireSession";
import { ClinicSettingsService } from "@/server/clinic-settings/ClinicSettingsService";

const colorEnum = z.enum([
  "blue",
  "indigo",
  "emerald",
  "rose",
  "amber",
  "violet",
  "cyan",
  "teal",
  "pink",
  "orange",
  "slate",
]);

const statusColorsSchema = z.object({
  SCHEDULED: colorEnum.optional(),
  CONFIRMED: colorEnum.optional(),
  CANCELLED: colorEnum.optional(),
  COMPLETED: colorEnum.optional(),
  NO_SHOW: colorEnum.optional(),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    const item = await ClinicSettingsService.getStatusColors(session.clinicId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al cargar configuración.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const body = await req.json();
    const parsed = statusColorsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos." },
        { status: 400 }
      );
    }
    await ClinicSettingsService.upsertStatusColors(
      session.clinicId,
      parsed.data as Record<string, string>
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al guardar configuración.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    await ClinicSettingsService.resetStatusColors(session.clinicId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al restablecer configuración.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
