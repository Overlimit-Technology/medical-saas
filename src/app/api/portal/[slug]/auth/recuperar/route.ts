import { NextResponse } from "next/server";
import { z } from "zod";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { PortalAuthService } from "@/server/portal/PortalAuthService";
import { invalid, portalErrorResponse, requirePortalClinic, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  identifier: z.string().trim().min(3, "Escribe tu RUT o tu correo.").max(120),
});

/** Paso 1 de recuperar la contrasena: envia el codigo al correo de la cuenta, si existe. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "portalAuth")) return tooMany();
    const clinic = await requirePortalClinic(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    await PortalAuthService.requestResetCode(clinic, parsed.data.identifier);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos enviar el codigo.");
  }
}
