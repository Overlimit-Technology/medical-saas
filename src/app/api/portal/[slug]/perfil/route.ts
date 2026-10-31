import { NextResponse } from "next/server";
import { z } from "zod";
import { PortalService, requirePortalApi } from "@/server/portal/PortalService";
import { invalid, portalErrorResponse } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const phone = z
  .string()
  .trim()
  .regex(/^$|^[+\d][\d\s-]{7,15}$/, "Escribe un telefono valido.");

const bodySchema = z.object({
  phone,
  address: z.string().trim().max(160),
  city: z.string().trim().max(80),
  emergencyContactName: z.string().trim().max(80),
  emergencyContactPhone: phone,
});

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const ctx = await requirePortalApi(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    await PortalService.updateProfile(ctx, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos guardar tus datos.");
  }
}
