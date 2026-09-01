import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { uploadDoctorSignature } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Cada usuario administra unicamente su propia firma, por eso no hay guarda de rol:
 * el userId sale de la sesion y nunca del cuerpo de la peticion.
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Archivo no valido." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: `Solo se permiten imagenes (recibido: ${file.type || "desconocido"}).` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { ok: false, error: `La firma no puede superar 2 MB (pesa ${mb} MB).` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const signatureUrl = await uploadDoctorSignature(buffer, session.userId, file.type);

    // updateMany en vez de update: si el usuario aun no tiene ficha de perfil,
    // preferimos un mensaje claro antes que el P2025 crudo de Prisma.
    const { count } = await prisma.userProfile.updateMany({
      where: { userId: session.userId },
      data: { signatureUrl },
    });

    if (count === 0) {
      return NextResponse.json(
        { ok: false, error: "Completa tu nombre y apellido en el perfil antes de subir la firma." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, signatureUrl }, { status: 201 });
  } catch (error) {
    console.error("[profile/signature] POST fallo:", error);
    const message = error instanceof Error ? error.message : "No se pudo subir la firma.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const session = await requireClinicSession();

    await prisma.userProfile.updateMany({
      where: { userId: session.userId },
      data: { signatureUrl: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profile/signature] DELETE fallo:", error);
    const message = error instanceof Error ? error.message : "No se pudo quitar la firma.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
