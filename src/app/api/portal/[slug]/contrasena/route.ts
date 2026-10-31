import { NextResponse } from "next/server";
import { z } from "zod";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { PortalAuthService } from "@/server/portal/PortalAuthService";
import { requirePortalApi } from "@/server/portal/PortalService";
import { invalid, portalErrorResponse, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ current: z.string().min(1).max(120), next: z.string().min(8).max(120) });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "portalAuth")) return tooMany();
    const ctx = await requirePortalApi(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid("La nueva contrasena debe tener al menos 8 caracteres.");
    await PortalAuthService.changePassword(ctx.patient.accountId, parsed.data.current, parsed.data.next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos cambiar tu contrasena.");
  }
}
