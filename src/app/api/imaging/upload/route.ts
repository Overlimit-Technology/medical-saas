import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { uploadImagingAsset } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["PATIENTS", "CLINICAL_VISITS"]);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no valido." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const assetUrl = await uploadImagingAsset(buffer, session.userId, file.type);

    return NextResponse.json({ ok: true, assetUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir la imagenologia.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
