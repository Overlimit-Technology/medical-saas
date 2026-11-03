import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { mimeFor, readLocal } from "@/server/dashboard/dashboardFiles";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Sirve un archivo guardado en modo local, solo a la sede que lo subio. */
export async function GET(req: Request, { params }: { params: { key: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const bytes = await readLocal(session.clinicId, params.key);
    const download = new URL(req.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeFor(params.key),
        "Content-Disposition": download ? "attachment" : "inline",
        "Cache-Control": "private, max-age=300",
        // Un SVG subido no puede ejecutar scripts aunque se abra directo.
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se encontró el archivo.";
    const code = (error as NodeJS.ErrnoException)?.code === "ENOENT" ? 404 : mapErrorToHttpStatus(message);
    return NextResponse.json({ ok: false, error: code === 404 ? "No se encontró el archivo." : message }, { status: code });
  }
}
