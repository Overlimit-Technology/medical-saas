import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession } from "@/server/auth/requireSession";
import { ProfessionalInvoicesService } from "@/server/professional-payouts/ProfessionalInvoicesService";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido. Usa el formato YYYY-MM.")
    .optional(),
});

/**
 * ADMIN: todas las boletas de la sede.
 * SECRETARY: solo las de profesionales con delegacion del SII vigente.
 * DOCTOR: solo las propias.
 */
export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({ month: searchParams.get("month") ?? undefined });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Mes invalido." },
        { status: 400 }
      );
    }

    const base = { clinicId: session.clinicId, month: parsed.data.month };
    let invoices;

    if (session.role === "ADMIN") {
      invoices = await ProfessionalInvoicesService.list(base);
    } else if (session.role === "SECRETARY") {
      const all = await ProfessionalInvoicesService.list(base);
      invoices = all.filter((invoice) => invoice.delegationActive);
    } else {
      invoices = await ProfessionalInvoicesService.list({ ...base, doctorId: session.userId });
    }

    return NextResponse.json({ ok: true, data: { invoices, role: session.role } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las boletas.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
