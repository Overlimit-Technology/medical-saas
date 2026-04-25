import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ProfessionalPayoutsService } from "@/server/professional-payouts/ProfessionalPayoutsService";

export const dynamic = "force-dynamic";

const sendProfessionalPayoutEmailsSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido. Usa el formato YYYY-MM."),
});

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = sendProfessionalPayoutEmailsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Mes invalido." },
        { status: 400 }
      );
    }

    const result = await ProfessionalPayoutsService.sendMonthlyPayoutEmails({
      clinicId: session.clinicId,
      month: parsed.data.month,
      origin: new URL(req.url).origin,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron enviar las boletas por correo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
