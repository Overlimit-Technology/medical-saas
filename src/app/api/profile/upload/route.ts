import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { uploadProfileImage } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no valido." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Solo se permiten imagenes." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageUrl = await uploadProfileImage(buffer, session.userId);

    return NextResponse.json({ ok: true, imageUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
