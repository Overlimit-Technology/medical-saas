import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDashboardAsset, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { deleteLocal, mimeFor, saveLocal, validateUpload } from "@/server/dashboard/dashboardFiles";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Subida en modo local (sin Cloudinary): POST multipart con "file".
 * Con Cloudinary el navegador sube directo con la firma de /api/dashboard/files/sign.
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    if (isCloudinaryConfigured()) {
      return NextResponse.json({ ok: false, error: "Sube el archivo con la firma de Cloudinary." }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No llegó ningún archivo." }, { status: 400 });
    const problem = validateUpload(file.name, file.type, file.size);
    if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });

    const key = await saveLocal(session.clinicId, file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(
      {
        ok: true,
        file: {
          id: key.split(".")[0],
          name: file.name,
          mime: file.type || mimeFor(file.name),
          size: file.size,
          url: `/api/dashboard/files/${key}`,
          storage: "local",
          key,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: mapErrorToHttpStatus(message) });
  }
}

const deleteSchema = z.object({
  storage: z.enum(["local", "cloudinary"]),
  key: z.string().min(1).max(400),
  resourceType: z.enum(["image", "raw", "video"]).optional(),
});

/** Borra un archivo del almacenamiento (el widget lo quita de su lista por su cuenta). */
export async function DELETE(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    const { storage, key, resourceType } = parsed.data;
    if (storage === "local") await deleteLocal(session.clinicId, key);
    else await deleteDashboardAsset(session.clinicId, key, resourceType ?? "image");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar el archivo.";
    return NextResponse.json({ ok: false, error: message }, { status: mapErrorToHttpStatus(message) });
  }
}
