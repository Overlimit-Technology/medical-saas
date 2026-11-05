/**
 * Cifrado de campos sensibles de la ficha (notas, anamnesis, firmas, grabaciones, fotos).
 * AES-256-GCM con la clave de CLINICAL_DATA_KEY (32 bytes en base64), que vive solo en variables de
 * entorno: nunca en el repositorio. Formato: "enc:v1:<iv>.<tag>.<datos>" en base64url.
 *
 * Los valores sin el prefijo se devuelven tal cual al leer, asi los datos anteriores al cifrado siguen
 * funcionando y se cifran la proxima vez que se guardan.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.CLINICAL_DATA_KEY?.trim();
  if (!raw) throw new Error("Falta CLINICAL_DATA_KEY: la ficha no puede guardar datos sensibles sin cifrar.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("CLINICAL_DATA_KEY debe ser de 32 bytes en base64.");
  return buf;
}

export function encryptField(plain: string): string {
  if (!plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptField(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  const [iv, tag, data] = value.slice(PREFIX.length).split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const isEncrypted = (value: string | null | undefined) => Boolean(value?.startsWith(PREFIX));
