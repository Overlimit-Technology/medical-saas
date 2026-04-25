import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ProfessionalPayoutsService } from "@/server/professional-payouts/ProfessionalPayoutsService";

export const dynamic = "force-dynamic";

const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido. Usa el formato YYYY-MM."),
});

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const parsed = monthSchema.safeParse({
      month: searchParams.get("month") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Mes invalido." },
        { status: 400 }
      );
    }

    const data = await ProfessionalPayoutsService.getMonthlyPayouts(
      session.clinicId,
      parsed.data.month
    );

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo calcular la liquidacion mensual.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
