// Sesiones multiples en equipos compartidos (opt-in por sede).
// Ver docs/SESIONES-EQUIPO-COMPARTIDO.md para el modelo de amenazas.
//
// - mg_session sigue siendo la UNICA sesion viva (la del perfil activo).
// - mg_device (httpOnly, firmada) solo guarda la lista de perfiles "estacionados":
//   quien son y cuando ingresaron su contrasena por ultima vez. No contiene
//   credenciales ni permisos: en cada cambio se reconstruye la sesion desde la BD.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionCookieValue } from "@/lib/session";
import { AuditService } from "@/server/audit/AuditService";
import { createMgClinicToken } from "@/server/clinics/mgClinic";
import { signPayload, verifyPayload } from "@/server/security/signedCookie";

export const DEVICE_COOKIE = "mg_device";
export const MAX_DEVICE_PROFILES = 6;
export const DEFAULT_IDLE_MINUTES = 10;
export const DEFAULT_MAX_HOURS = 8;
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_MAX_SECONDS = 60 * 60 * 8;
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_WINDOW_MS = 10 * 60 * 1000;
export const FAILED_EVENT = "SESION_COMPARTIDA_CLAVE_FALLIDA";

export type DeviceProfile = {
  u: string; // userId
  n: string; // nombre visible (solo para mostrar)
  r: string; // rol (solo para mostrar; el rol real viene de la BD)
  a: number; // lastAuthAt (unix s). 0 = obliga contrasena
};

export type DevicePayload = {
  v: 1;
  clinicId: string;
  exp: number;
  p: DeviceProfile[];
};

export class SharedAuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

export const nowSeconds = () => Math.floor(Date.now() / 1000);

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET no esta definido");
  return value;
}

export async function readDevice(): Promise<DevicePayload | null> {
  const raw = cookies().get(DEVICE_COOKIE)?.value;
  const device = (await verifyPayload<Record<string, never>>(raw, secret())) as unknown as DevicePayload | null;
  if (!device || device.v !== 1 || typeof device.clinicId !== "string") return null;
  if (typeof device.exp !== "number" || device.exp <= nowSeconds()) return null;
  if (!Array.isArray(device.p)) return null;
  const profiles = device.p
    .filter((x) => x && typeof x.u === "string" && typeof x.a === "number")
    .slice(0, MAX_DEVICE_PROFILES)
    .map((x) => ({ u: x.u, n: String(x.n ?? "").slice(0, 60), r: String(x.r ?? ""), a: x.a }));
  return { ...device, p: profiles };
}

export async function writeDevice(clinicId: string, profiles: DeviceProfile[]) {
  if (profiles.length === 0) {
    clearDevice();
    return;
  }
  const exp = nowSeconds() + DEVICE_TTL_SECONDS;
  const value = await signPayload({ v: 1, clinicId, exp, p: profiles } as never, secret());
  cookies().set(DEVICE_COOKIE, value, { ...cookieBase(), expires: new Date(exp * 1000) });
}

export function clearDevice() {
  cookies().set(DEVICE_COOKIE, "", { ...cookieBase(), expires: new Date(0) });
}

export function clearSessionCookies() {
  cookies().set("mg_session", "", { ...cookieBase(), expires: new Date(0) });
  cookies().set("mg_clinic", "", { ...cookieBase(), expires: new Date(0) });
}

export async function getSharedConfig(clinicId: string) {
  const s = await prisma.clinicSettings.findUnique({
    where: { clinicId },
    select: {
      sharedSessionsEnabled: true,
      sharedIdleLockMinutes: true,
      sharedMaxHoursWithoutPassword: true,
    },
  });
  return {
    enabled: s?.sharedSessionsEnabled === true,
    idleMinutes: s?.sharedIdleLockMinutes ?? DEFAULT_IDLE_MINUTES,
    maxHours: s?.sharedMaxHoursWithoutPassword ?? DEFAULT_MAX_HOURS,
  };
}

/** Un perfil puede entrar sin contrasena solo dentro de la ventana y si no es ADMIN. */
export function withinWindow(profile: DeviceProfile, maxHours: number) {
  return profile.a > 0 && nowSeconds() - profile.a < maxHours * 3600;
}

export function canSwitchWithoutPassword(profile: DeviceProfile, maxHours: number) {
  return profile.r !== "ADMIN" && withinWindow(profile, maxHours);
}

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  usesNewPlatform: boolean;
  status: string;
  mustChangePassword: boolean;
  passwordHash?: string | null;
  profile: { firstName: string; lastName: string } | null;
};

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isSuperAdmin: true,
  permissions: true,
  usesNewPlatform: true,
  status: true,
  mustChangePassword: true,
  profile: { select: { firstName: true, lastName: true } },
} as const;

export function displayName(user: DbUser) {
  const full = user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : "";
  return (full || user.name || user.email).slice(0, 60);
}

/** Lee el usuario; passwordHash solo con select explicito (withHash). */
export async function loadUser(
  where: { id: string } | { email: string },
  withHash = false
): Promise<DbUser | null> {
  return (await prisma.user.findFirst({
    where: "id" in where ? { id: where.id } : { email: { equals: where.email, mode: "insensitive" } },
    select: withHash ? { ...userSelect, passwordHash: true } : userSelect,
  })) as DbUser | null;
}

/** Revalida en BD que el usuario pueda operar en la sede del equipo. */
export async function assertUserCanUseDevice(user: DbUser, clinicId: string) {
  if (user.status !== "ACTIVE") {
    throw new SharedAuthError("La cuenta esta inactiva o suspendida. Contacta al administrador.", 403, "USER_INACTIVE");
  }
  if (user.isSuperAdmin) {
    throw new SharedAuthError("Las cuentas de plataforma no pueden usar equipos compartidos.", 403, "SUPER_ADMIN");
  }
  if (user.usesNewPlatform === false) {
    throw new SharedAuthError("Esta cuenta usa el portal clasico.", 403, "LEGACY");
  }
  if (user.mustChangePassword) {
    throw new SharedAuthError(
      "Esta cuenta debe cambiar su contrasena. Inicia sesion normalmente para hacerlo.",
      403,
      "MUST_CHANGE_PASSWORD"
    );
  }
  const membership = await prisma.clinicMembership.findFirst({
    where: { userId: user.id, clinicId, status: "ACTIVE", clinic: { isActive: true } },
    select: { id: true },
  });
  if (!membership) {
    throw new SharedAuthError("El usuario no pertenece a la sede de este equipo.", 403, "NOT_MEMBER");
  }
}

async function recentFailures(key: string) {
  return prisma.auditLog.count({
    where: {
      event: FAILED_EVENT,
      author: key,
      occurredAt: { gte: new Date(Date.now() - FAILED_WINDOW_MS) },
    },
  });
}

/** Verifica contrasena con limite de intentos (basado en auditoria: vale entre instancias). */
export async function checkPassword(email: string, hash: string | null | undefined, password: string) {
  const key = email.toLowerCase();
  if ((await recentFailures(key)) >= MAX_FAILED_ATTEMPTS) {
    throw new SharedAuthError(
      "Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.",
      429,
      "RATE_LIMITED"
    );
  }
  const ok = hash ? await verifyPassword(password, hash) : false;
  if (!ok) {
    await AuditService.log(FAILED_EVENT, key, "Contrasena incorrecta en equipo compartido");
    throw new SharedAuthError("Contrasena incorrecta.", 401, "BAD_PASSWORD");
  }
}

/** Emite mg_session y mg_clinic del perfil activo. Su vigencia nunca excede la ventana sin contrasena. */
export async function issueSession(user: DbUser, clinicId: string, authAt: number, maxHours: number) {
  const exp = Math.min(nowSeconds() + SESSION_MAX_SECONDS, authAt + maxHours * 3600);
  const value = createSessionCookieValue(
    {
      userId: user.id,
      role: user.role,
      isSuperAdmin: false,
      permissions: user.permissions ?? [],
      usesNewPlatform: user.usesNewPlatform ?? true,
      exp,
      mustChangePassword: false,
    },
    secret()
  );
  cookies().set("mg_session", value, { ...cookieBase(), expires: new Date(exp * 1000) });
  const clinic = await createMgClinicToken({ userId: user.id, clinicId, setAt: nowSeconds(), exp });
  cookies().set("mg_clinic", clinic, { ...cookieBase(), expires: new Date(exp * 1000) });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
}

export function upsertProfile(profiles: DeviceProfile[], next: DeviceProfile) {
  const rest = profiles.filter((x) => x.u !== next.u);
  if (rest.length >= MAX_DEVICE_PROFILES) {
    throw new SharedAuthError(
      `Este equipo admite hasta ${MAX_DEVICE_PROFILES} perfiles. Cierra uno para agregar otro.`,
      409,
      "DEVICE_FULL"
    );
  }
  return [...rest, next];
}

export function errorResponse(error: unknown, fallback: string) {
  if (error instanceof SharedAuthError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
        requiresPassword: error.code === "BAD_PASSWORD" || error.code === "PASSWORD_REQUIRED",
      },
      { status: error.status }
    );
  }
  const message = error instanceof Error ? error.message : "";
  if (/No autorizado/i.test(message)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (/Clinica no seleccionada|Debes cambiar|Acceso denegado/i.test(message)) {
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
  console.error("[shared-device]", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 400 });
}
