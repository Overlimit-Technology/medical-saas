import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AuditService } from "@/server/audit/AuditService";
import { readMgSession } from "@/server/auth/mgSession";
import {
  assertUserCanUseDevice,
  canSwitchWithoutPassword,
  checkPassword,
  clearDevice,
  displayName,
  errorResponse,
  getSharedConfig,
  issueSession,
  loadUser,
  nowSeconds,
  readDevice,
  SharedAuthError,
  writeDevice,
} from "@/server/auth/sharedDevice";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1).optional(),
});

/**
 * POST /api/auth/switch { userId, password? }
 * Cambia el perfil activo del equipo compartido.
 * - Sin contrasena solo si: hay una sesion vigente de un perfil de este equipo, el modo
 *   sigue habilitado en la sede, el perfil destino ingreso su contrasena dentro de la
 *   ventana y no es ADMIN.
 * - En cualquier otro caso (incluida la pantalla de bloqueo) exige la contrasena del destino.
 * - Siempre revalida en BD: usuario ACTIVE, sin cambio de clave pendiente y miembro de la sede.
 */
export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }
    const { userId, password } = parsed.data;

    const device = await readDevice();
    if (!device) throw new SharedAuthError("Este equipo no esta en modo compartido.", 403, "NOT_SHARED");

    const config = await getSharedConfig(device.clinicId);
    if (!config.enabled) {
      clearDevice();
      throw new SharedAuthError("La sede deshabilito las sesiones multiples en equipos compartidos.", 403, "DISABLED");
    }

    const target = device.p.find((p) => p.u === userId);
    if (!target) throw new SharedAuthError("Ese perfil no esta en este equipo.", 404, "NOT_IN_DEVICE");

    const session = await readMgSession(cookies().get("mg_session")?.value);
    const callerInDevice = !!session && device.p.some((p) => p.u === session.userId);
    if (session && callerInDevice && session.userId === userId) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const user = await loadUser({ id: userId }, true);
    if (!user) {
      await writeDevice(device.clinicId, device.p.filter((p) => p.u !== userId));
      throw new SharedAuthError("El usuario ya no existe.", 404, "NOT_FOUND");
    }

    try {
      await assertUserCanUseDevice(user, device.clinicId);
    } catch (error) {
      // Suspendido, sacado de la sede, etc.: se retira del equipo.
      await writeDevice(device.clinicId, device.p.filter((p) => p.u !== userId));
      await AuditService.log("SESION_COMPARTIDA_RECHAZADA", user.email, `Cambio rechazado y perfil retirado: ${error instanceof Error ? error.message : "error"}`);
      throw error;
    }

    // El rol real es el de la BD, no el guardado en la cookie.
    const freshTarget = { ...target, r: user.role };
    const passwordless = !password && callerInDevice && canSwitchWithoutPassword(freshTarget, config.maxHours);
    let authAt = target.a;

    if (!passwordless) {
      if (!password) {
        throw new SharedAuthError("Ingresa la contrasena de este usuario para continuar.", 401, "PASSWORD_REQUIRED");
      }
      await checkPassword(user.email, user.passwordHash, password);
      authAt = nowSeconds();
    }

    await writeDevice(
      device.clinicId,
      device.p.map((p) => (p.u === userId ? { u: user.id, n: displayName(user), r: user.role, a: authAt } : p))
    );
    await issueSession(user, device.clinicId, authAt, config.maxHours);

    const from = session ? await loadUser({ id: session.userId }) : null;
    await AuditService.log(
      "SESION_COMPARTIDA_CAMBIO",
      user.email,
      `Cambio de perfil ${from ? `desde ${from.email}` : "desde pantalla bloqueada"} (${passwordless ? "sin contrasena, dentro de ventana" : "con contrasena"}).`
    );
    return NextResponse.json({ ok: true, passwordless });
  } catch (error) {
    return errorResponse(error, "No se pudo cambiar de sesion.");
  }
}
