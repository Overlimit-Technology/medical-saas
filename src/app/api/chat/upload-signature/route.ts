import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { generateChatUploadSignature } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireClinicSession();

    const data = generateChatUploadSignature();

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar la firma de subida.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
