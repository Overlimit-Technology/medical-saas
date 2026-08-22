import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { uploadClinicLogo } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no valido." }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Formato no permitido. Usa PNG, JPG, WebP o SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "El logo no puede superar 2 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadClinicLogo(buffer, session.clinicId, file.type);

    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { logo: logoUrl },
    });

    return NextResponse.json({ ok: true, logoUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el logo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { logo: null },
    });

    // Limpia tambien el logo antiguo en base64 si quedaba alguno.
    await prisma.clinicSettings.updateMany({
      where: { clinicId: session.clinicId },
      data: { logoBase64: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo quitar el logo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
