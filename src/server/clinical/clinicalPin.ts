/**
 * PIN clinico: un segundo factor corto para abrir la ficha en computadores compartidos.
 *
 * - El PIN (4 a 6 digitos) se guarda con bcrypt en User.clinicalPinHash. Crearlo o cambiarlo pide la contrasena.
 * - Al desbloquear se firma la cookie mg_clinical con el usuario y un vencimiento corto que se renueva
 *   con cada accion en la ficha. El navegador ademas bloquea la pantalla tras 2 minutos sin actividad.
 * - 5 intentos fallidos en 10 minutos bloquean el PIN: hay que volver a crearlo con la contrasena.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signPayload, verifyPayload } from "@/server/security/signedCookie";
import type { SessionContext } from "@/server/auth/requireSession";
import { ClinicalAccessService } from "@/server/clinical/ClinicalAccessService";

export const CLINICAL_COOKIE = "mg_clinical";
/** Segundos sin actividad que el navegador espera antes de bloquear la ficha. */
export const CLINICAL_IDLE_SECONDS = 120;
/** Margen del servidor: la cookie vence un poco despues del bloqueo del navegador. */
const UNLOCK_SECONDS = CLINICAL_IDLE_SECONDS + 60;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const PIN_RE = /^\d{4,6}$/;

export type ClinicalLockCode = "PIN_REQUIRED" | "PIN_SETUP" | "PIN_BLOCKED";

const LOCK_MESSAGES: Record<ClinicalLockCode, string> = {
  PIN_REQUIRED: "La ficha esta bloqueada. Ingresa tu PIN.",
  PIN_SETUP: "Crea tu PIN para abrir fichas.",
  PIN_BLOCKED: "PIN bloqueado por intentos fallidos. Crea uno nuevo con tu contrasena.",
};

export class ClinicalLockedError extends Error {
  status = 423;
  constructor(public code: ClinicalLockCode = "PIN_REQUIRED") {
    super(LOCK_MESSAGES[code]);
  }
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET no esta definido");
  return value;
}

const now = () => Math.floor(Date.now() / 1000);

async function writeUnlock(userId: string, clinicId: string) {
  const token = await signPayload({ v: 1, u: userId, c: clinicId, exp: now() + UNLOCK_SECONDS }, secret());
  cookies().set(CLINICAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: UNLOCK_SECONDS,
  });
}

async function readUnlock(session: Pick<SessionContext, "userId" | "clinicId">) {
  const raw = cookies().get(CLINICAL_COOKIE)?.value;
  const p = await verifyPayload<{ v: number; u: string; c: string; exp: number }>(raw, secret());
  return Boolean(p && p.v === 1 && p.u === session.userId && p.c === session.clinicId && p.exp > now());
}

/** Intentos fallidos desde el ultimo acierto (o desde que se creo el PIN) dentro de la ventana. */
async function recentFails(userId: string) {
  const since = new Date(Date.now() - FAIL_WINDOW_MS);
  const lastOk = await prisma.clinicalAccessLog.findFirst({
    where: { userId, action: { in: ["PIN_OK", "PIN_SET"] }, occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  return prisma.clinicalAccessLog.count({
    where: { userId, action: "PIN_FAIL", occurredAt: { gt: lastOk?.occurredAt ?? since } },
  });
}

export async function pinStatus(session: SessionContext) {
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { clinicalPinHash: true } });
  const fails = user?.clinicalPinHash ? await recentFails(session.userId) : 0;
  return {
    hasPin: Boolean(user?.clinicalPinHash),
    unlocked: await readUnlock(session),
    blocked: fails >= MAX_FAILS,
    idleSeconds: CLINICAL_IDLE_SECONDS,
  };
}

/** Exige la ficha desbloqueada y renueva el plazo. Lanza ClinicalLockedError (423) si no. */
export async function requireClinicalUnlock(session: SessionContext) {
  if (await readUnlock(session)) {
    await writeUnlock(session.userId, session.clinicId);
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { clinicalPinHash: true } });
  if (!user?.clinicalPinHash) throw new ClinicalLockedError("PIN_SETUP");
  if ((await recentFails(session.userId)) >= MAX_FAILS) throw new ClinicalLockedError("PIN_BLOCKED");
  throw new ClinicalLockedError("PIN_REQUIRED");
}

export function validatePinFormat(pin: string) {
  if (!PIN_RE.test(pin)) return "El PIN debe tener entre 4 y 6 numeros.";
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
    return "Elige un PIN menos predecible (no repetido ni correlativo).";
  }
  return null;
}

/** Crea o cambia el PIN (tambien sirve para salir de un bloqueo). Siempre pide la contrasena. */
export async function setPin(session: SessionContext, password: string, pin: string, req?: Request) {
  const invalid = validatePinFormat(pin);
  if (invalid) throw new Error(invalid);
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("La contrasena no es correcta.");
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: { clinicalPinHash: await hashPassword(pin), clinicalPinSetAt: new Date() },
  });
  await ClinicalAccessService.log({ clinicId: session.clinicId, patientId: "-", userId: session.userId, action: "PIN_SET", resource: "pin", req });
  await writeUnlock(session.userId, session.clinicId);
}

export async function unlockWithPin(session: SessionContext, pin: string, req?: Request) {
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { clinicalPinHash: true } });
  if (!user?.clinicalPinHash) throw new ClinicalLockedError("PIN_SETUP");
  const fails = await recentFails(session.userId);
  if (fails >= MAX_FAILS) throw new ClinicalLockedError("PIN_BLOCKED");
  const ok = PIN_RE.test(pin) && (await verifyPassword(pin, user.clinicalPinHash));
  await ClinicalAccessService.log({ clinicId: session.clinicId, patientId: "-", userId: session.userId, action: ok ? "PIN_OK" : "PIN_FAIL", resource: "pin", req });
  if (!ok) {
    const left = MAX_FAILS - fails - 1;
    if (left <= 0) throw new ClinicalLockedError("PIN_BLOCKED");
    throw new Error(`PIN incorrecto. Te quedan ${left} intento${left === 1 ? "" : "s"}.`);
  }
  await writeUnlock(session.userId, session.clinicId);
}

export async function lockClinical(session: SessionContext, req?: Request) {
  cookies().delete(CLINICAL_COOKIE);
  await ClinicalAccessService.log({ clinicId: session.clinicId, patientId: "-", userId: session.userId, action: "LOCK", resource: "pin", req });
}
