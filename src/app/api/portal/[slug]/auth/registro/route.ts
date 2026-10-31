import { NextResponse } from "next/server";
import { z } from "zod";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { PortalAuthService } from "@/server/portal/PortalAuthService";
import { invalid, portalErrorResponse, requirePortalClinic, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  run: z.string().trim().min(7, "Escribe tu RUT.").max(14),
  email: z.string().trim().email("Escribe un correo valido.").max(120),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
});

/** Paso 1 del registro: envia el codigo de 6 digitos por correo. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "portalAuth")) return tooMany();
    const clinic = await requirePortalClinic(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const result = await PortalAuthService.requestSignupCode(clinic, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos enviar el codigo.");
  }
}
