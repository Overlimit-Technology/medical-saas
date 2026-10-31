import { NextResponse } from "next/server";
import { z } from "zod";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { PortalAuthService } from "@/server/portal/PortalAuthService";
import { setPortalSession } from "@/server/portal/portalSession";
import { invalid, portalErrorResponse, requirePortalClinic, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  identifier: z.string().trim().min(3, "Escribe tu RUT o correo.").max(120),
  password: z.string().min(1, "Escribe tu contrasena.").max(120),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "portalAuth")) return tooMany();
    const clinic = await requirePortalClinic(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const account = await PortalAuthService.login(clinic, parsed.data);
    await setPortalSession({ accountId: account.id, patientId: account.patientId, clinicId: account.clinicId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos iniciar tu sesion.");
  }
}
