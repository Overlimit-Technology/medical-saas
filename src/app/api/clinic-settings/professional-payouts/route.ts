import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ClinicSettingsService } from "@/server/clinic-settings/ClinicSettingsService";

export const dynamic = "force-dynamic";

const percentageSchema = z
  .number()
  .finite()
  .min(0)
  .max(100)
  .refine((value) => Number(value.toFixed(2)) === value, {
    message: "Cada porcentaje debe tener como maximo 2 decimales.",
  });

const professionalPayoutSettingsSchema = z.object({
  clinicPercentage: percentageSchema,
  siiPercentage: percentageSchema,
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const item = await ClinicSettingsService.getProfessionalPayoutSettings(session.clinicId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al cargar configuracion de liquidaciones.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const body = await req.json();
    const parsed = professionalPayoutSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    await ClinicSettingsService.upsertProfessionalPayoutSettings(
      session.clinicId,
      parsed.data
    );

    return NextResponse.json({ ok: true, item: parsed.data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al guardar configuracion de liquidaciones.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
