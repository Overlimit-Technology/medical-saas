import crypto from "crypto";

type SessionPayload = {
  userId: string;
  role: string;
  exp: number; // epoch seconds
  mustChangePassword?: boolean;
};

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function sign(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

/**
 * Crea el valor de cookie: "<payloadB64>.<sig>"
 * Esto NO es un JWT completo, pero cumple el objetivo MVP:
 * - Integridad (firma)
 * - Datos mínimos
 * - Expiración
 */
export function createSessionCookieValue(
  payload: SessionPayload,
  secret: string
) {
  const json = JSON.stringify(payload);
  const payloadB64 = base64url(json);
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Verifica y devuelve payload si es válido y no expiró; si no, null. */
export function verifySessionCookieValue(value: string, secret: string) {
  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64, secret);
  if (expected !== sig) return null;

  const json = Buffer.from(payloadB64.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8");
  const payload = JSON.parse(json) as SessionPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return payload;
}
