import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDashboardUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { validateUpload } from "@/server/dashboard/dashboardFiles";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ name: z.string().min(1).max(160), mime: z.string().max(120), size: z.number().int().min(0) });

/**
 * Antes de subir: valida tipo y tamaño y dice como subir.
 * Con Cloudinary devuelve una firma para la carpeta de la sede; sin Cloudinary, { mode: "local" }.
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    const problem = validateUpload(parsed.data.name, parsed.data.mime, parsed.data.size);
    if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });

    if (!isCloudinaryConfigured()) return NextResponse.json({ ok: true, mode: "local" });
    return NextResponse.json({ ok: true, mode: "cloudinary", ...generateDashboardUploadSignature(session.clinicId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo preparar la subida.";
    return NextResponse.json({ ok: false, error: message }, { status: mapErrorToHttpStatus(message) });
  }
}
