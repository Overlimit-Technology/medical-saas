import { NextResponse } from "next/server";
import { AuditService } from "@/server/audit/AuditService";
import { requireClinicSession } from "@/server/auth/requireSession";
import {
  clearSessionCookies,
  errorResponse,
  loadUser,
  readDevice,
  SharedAuthError,
  writeDevice,
} from "@/server/auth/sharedDevice";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/device/lock
 * Bloquea la pantalla: elimina la sesion viva y obliga la contrasena de este perfil
 * para volver (su lastAuthAt pasa a 0). Los demas perfiles siguen estacionados.
 */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const device = await readDevice();
    if (!device || device.clinicId !== session.clinicId || !device.p.some((p) => p.u === session.userId)) {
      throw new SharedAuthError("Este equipo no esta en modo compartido.", 400, "NOT_SHARED");
    }
    await writeDevice(
      device.clinicId,
      device.p.map((p) => (p.u === session.userId ? { ...p, a: 0 } : p))
    );
    clearSessionCookies();
    const user = await loadUser({ id: session.userId });
    const reason = new URL(req.url).searchParams.get("reason") === "idle" ? "inactividad" : "manual";
    await AuditService.log("SESION_COMPARTIDA_BLOQUEO", user?.email ?? session.userId, `Pantalla bloqueada (${reason}).`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "No se pudo bloquear la pantalla.");
  }
}
