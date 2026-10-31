import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { signPayload, verifyPayload } from "@/server/security/signedCookie";

// Sesion del paciente en el portal. Es una cookie distinta de la del equipo (mg_session)
// y se firma con una llave derivada, para que una nunca sirva como la otra.
export const PORTAL_COOKIE = "zs_portal";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type PortalSessionPayload = {
  kind: "patient";
  accountId: string;
  patientId: string;
  clinicId: string;
  exp: number;
};

export function portalSecret() {
  const base = process.env.PATIENT_PORTAL_SECRET ?? process.env.SESSION_SECRET;
  if (!base) throw new Error("SESSION_SECRET no esta configurado.");
  return createHmac("sha256", base).update("zensya-patient-portal").digest("hex");
}

export async function setPortalSession(data: Omit<PortalSessionPayload, "kind" | "exp">) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const value = await signPayload({ kind: "patient", ...data, exp }, portalSecret());
  cookies().set(PORTAL_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

export async function readPortalSession(): Promise<PortalSessionPayload | null> {
  const value = cookies().get(PORTAL_COOKIE)?.value;
  const payload = await verifyPayload<PortalSessionPayload>(value, portalSecret());
  if (!payload || payload.kind !== "patient") return null;
  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (!payload.accountId || !payload.patientId || !payload.clinicId) return null;
  return payload;
}

export function clearPortalSession() {
  cookies().set(PORTAL_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
}
