import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditService } from "@/server/audit/AuditService";
import {
  assertUserCanUseDevice,
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
  upsertProfile,
  writeDevice,
} from "@/server/auth/sharedDevice";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electronico invalido"),
  password: z.string().min(1, "La contrasena es obligatoria"),
});

/**
 * POST /api/auth/device/add
 * Inicio de sesion completo (correo + contrasena) de otro profesional en un equipo ya
 * compartido. Lo suma a la lista sin cerrar a los demas y pasa a ser el perfil activo.
 */
export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    const device = await readDevice();
    if (!device) {
      throw new SharedAuthError("Este equipo no esta en modo compartido.", 403, "NOT_SHARED");
    }
    const config = await getSharedConfig(device.clinicId);
    if (!config.enabled) {
      clearDevice();
      throw new SharedAuthError("La sede deshabilito las sesiones multiples en equipos compartidos.", 403, "DISABLED");
    }

    const user = await loadUser({ email: parsed.data.email }, true);
    if (!user) {
      await checkPassword(parsed.data.email, null, parsed.data.password);
      throw new SharedAuthError("Credenciales invalidas.", 401, "BAD_PASSWORD");
    }
    await checkPassword(user.email, user.passwordHash, parsed.data.password);
    await assertUserCanUseDevice(user, device.clinicId);

    const authAt = nowSeconds();
    await writeDevice(
      device.clinicId,
      upsertProfile(device.p, { u: user.id, n: displayName(user), r: user.role, a: authAt })
    );
    await issueSession(user, device.clinicId, authAt, config.maxHours);
    await AuditService.log("SESION_COMPARTIDA_AGREGADA", user.email, "Perfil agregado al equipo compartido con contrasena.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "No se pudo agregar el profesional.");
  }
}
