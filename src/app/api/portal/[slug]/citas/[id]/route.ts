import { NextResponse } from "next/server";
import { z } from "zod";
import { PortalService, requirePortalApi } from "@/server/portal/PortalService";
import { invalid, portalErrorResponse } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ action: z.enum(["confirm", "cancel"]) });

export async function PATCH(req: Request, { params }: { params: { slug: string; id: string } }) {
  try {
    const ctx = await requirePortalApi(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid("Accion invalida.");
    await PortalService.changeAppointment(ctx, params.id, parsed.data.action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos actualizar tu cita.");
  }
}
