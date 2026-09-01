import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { uploadClinicLogo } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    // Forma objeto: la forma string descarta isSuperAdmin y deja fuera al super admin.
    requireRole(session, ["ADMIN"]);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no valido." }, { status: 400 });
    }

    // Mismo criterio que /api/profile/upload; Cloudinary normaliza el resto.
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: `Solo se permiten imagenes (recibido: ${file.type || "desconocido"}).` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { ok: false, error: `El logo no puede superar 2 MB (pesa ${mb} MB).` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadClinicLogo(buffer, session.clinicId, file.type);

    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { logo: logoUrl },
    });

    return NextResponse.json({ ok: true, logoUrl }, { status: 201 });
  } catch (error) {
    console.error("[clinic-profile/logo] POST fallo:", error);
    const message = error instanceof Error ? error.message : "No se pudo subir el logo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"]);

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
    console.error("[clinic-profile/logo] DELETE fallo:", error);
    const message = error instanceof Error ? error.message : "No se pudo quitar el logo.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
