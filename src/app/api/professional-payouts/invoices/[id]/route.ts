import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession } from "@/server/auth/requireSession";
import { ProfessionalInvoicesService } from "@/server/professional-payouts/ProfessionalInvoicesService";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue"), invoiceNumber: z.string().trim().min(1).max(10) }),
  z.object({
    action: z.literal("status"),
    status: z.enum(["PAID", "CANCELLED", "PENDING"]),
  }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    const parsed = bodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    if (parsed.data.action === "issue") {
      await ProfessionalInvoicesService.markIssued({
        clinicId: session.clinicId,
        id: params.id,
        actorUserId: session.userId,
        actorRole: session.role,
        invoiceNumber: parsed.data.invoiceNumber,
      });
    } else {
      if (session.role !== "ADMIN") {
        return NextResponse.json(
          { ok: false, error: "Solo un administrador puede cambiar este estado." },
          { status: 403 }
        );
      }
      await ProfessionalInvoicesService.setStatus({
        clinicId: session.clinicId,
        id: params.id,
        status: parsed.data.status,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la boleta.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
