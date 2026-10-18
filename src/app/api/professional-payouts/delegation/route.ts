import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession } from "@/server/auth/requireSession";
import { ProfessionalInvoicesService } from "@/server/professional-payouts/ProfessionalInvoicesService";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // Fecha YYYY-MM-DD hasta la que dura la autorizacion en el SII, o null para revocar.
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida.")
    .nullable(),
});

const MAX_DELEGATION_DAYS = 366;

/** El profesional registra que autorizo a la clinica en el SII (vigencia maxima de un ano). */
export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    const parsed = bodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Fecha invalida." },
        { status: 400 }
      );
    }

    let until: Date | null = null;
    if (parsed.data.until) {
      until = new Date(`${parsed.data.until}T23:59:59`);
      const diffDays = (until.getTime() - Date.now()) / 86_400_000;
      if (Number.isNaN(until.getTime()) || diffDays <= 0) {
        return NextResponse.json(
          { ok: false, error: "La fecha debe ser futura." },
          { status: 400 }
        );
      }
      if (diffDays > MAX_DELEGATION_DAYS) {
        return NextResponse.json(
          { ok: false, error: "La autorizacion del SII dura como maximo un ano." },
          { status: 400 }
        );
      }
    }

    await ProfessionalInvoicesService.setDelegation({ doctorId: session.userId, until });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la delegacion.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
