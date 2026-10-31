import { NextResponse } from "next/server";
import { z } from "zod";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { PortalAuthService } from "@/server/portal/PortalAuthService";
import { setPortalSession } from "@/server/portal/portalSession";
import { invalid, portalErrorResponse, requirePortalClinic, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  run: z.string().trim().min(7).max(14),
  code: z.string().trim().regex(/^\d{6}$/, "El codigo tiene 6 numeros."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres.").max(120),
});

/** Paso 2 del registro: valida el codigo, crea la cuenta e inicia la sesion. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "portalAuth")) return tooMany();
    const clinic = await requirePortalClinic(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const account = await PortalAuthService.verifyAndCreate(clinic, parsed.data);
    await setPortalSession({ accountId: account.id, patientId: account.patientId, clinicId: account.clinicId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos crear tu cuenta.");
  }
}
