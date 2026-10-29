import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AuditService } from "@/server/audit/AuditService";
import { readMgSession } from "@/server/auth/mgSession";
import { requireClinicSession } from "@/server/auth/requireSession";
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
  upsertProfile,
  writeDevice,
} from "@/server/auth/sharedDevice";
import { readMgClinic } from "@/server/clinics/mgClinic";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/device
 * Estado del equipo compartido. Con sesion: perfiles y si se puede activar.
 * Sin sesion (pantalla de bloqueo): solo nombre y rol de los perfiles del equipo.
 */
export async function GET() {
  try {
    const session = await readMgSession(cookies().get("mg_session")?.value);
    const device = await readDevice();

    if (!session) {
      if (!device) return NextResponse.json({ ok: true, active: false, locked: false, profiles: [] });
      const config = await getSharedConfig(device.clinicId);
      if (!config.enabled) {
        clearDevice();
        return NextResponse.json({ ok: true, active: false, locked: false, profiles: [] });
      }
      return NextResponse.json({
        ok: true,
        active: true,
        locked: true,
        profiles: device.p.map((p) => ({ userId: p.u, name: p.n, role: p.r, active: false, requiresPassword: true })),
      });
    }

    const clinic = await readMgClinic(cookies().get("mg_clinic")?.value);
    if (!clinic || clinic.userId !== session.userId || session.isSuperAdmin === true) {
      return NextResponse.json({ ok: true, available: false, active: false, profiles: [] });
    }

    const config = await getSharedConfig(clinic.clinicId);
    const sameDevice = device && device.clinicId === clinic.clinicId && config.enabled;
    const mine = sameDevice ? device.p.find((p) => p.u === session.userId) : undefined;

    return NextResponse.json({
      ok: true,
      available: config.enabled,
      active: !!mine,
      currentUserId: session.userId,
      idleMinutes: config.idleMinutes,
      maxHours: config.maxHours,
      profiles:
        mine && device
          ? device.p.map((p) => ({
              userId: p.u,
              name: p.n,
              role: p.r,
              active: p.u === session.userId,
              requiresPassword: !canSwitchWithoutPassword(p, config.maxHours),
            }))
          : [],
    });
  } catch (error) {
    return errorResponse(error, "No se pudo leer el estado del equipo.");
  }
}

const activateSchema = z.object({
  password: z.string().min(1, "La contrasena es obligatoria"),
  accept: z.literal(true, { message: "Debes aceptar los riesgos." }),
});

/** POST /api/auth/device: activa el modo compartido en este equipo (aviso + contrasena). */
export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const parsed = activateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    const config = await getSharedConfig(session.clinicId);
    if (!config.enabled) {
      throw new SharedAuthError("La sede no habilito las sesiones multiples en equipos compartidos.", 403, "DISABLED");
    }

    const user = await loadUser({ id: session.userId }, true);
    if (!user) throw new SharedAuthError("No autorizado.", 401, "NO_USER");
    await assertUserCanUseDevice(user, session.clinicId);
    await checkPassword(user.email, user.passwordHash, parsed.data.password);

    const current = await readDevice();
    const profiles = current && current.clinicId === session.clinicId ? current.p : [];
    const authAt = nowSeconds();
    await writeDevice(
      session.clinicId,
      upsertProfile(profiles, { u: user.id, n: displayName(user), r: user.role, a: authAt })
    );
    await issueSession(user, session.clinicId, authAt, config.maxHours);
    await AuditService.log(
      "SESION_COMPARTIDA_ACTIVADA",
      user.email,
      `Equipo marcado como compartido en la sede ${session.clinicId}. Riesgos aceptados.`
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "No se pudo activar el equipo compartido.");
  }
}

/**
 * DELETE /api/auth/device: quita el modo compartido de este equipo.
 * Descarta los perfiles estacionados; la sesion activa (si existe) se conserva.
 * No exige sesion para que la pantalla de bloqueo pueda salir de un estado atascado.
 */
export async function DELETE() {
  try {
    const session = await readMgSession(cookies().get("mg_session")?.value);
    const device = await readDevice();
    clearDevice();
    if (device) {
      const user = session ? await loadUser({ id: session.userId }) : null;
      await AuditService.log(
        "SESION_COMPARTIDA_DESACTIVADA",
        user?.email ?? "pantalla-bloqueo",
        `Equipo sacado del modo compartido; ${device.p.length} perfil(es) descartado(s).`
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "No se pudo desactivar el equipo compartido.");
  }
}
