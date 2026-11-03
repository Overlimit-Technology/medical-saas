/**
 * Archivos del widget "Archivos" del panel personalizable.
 *
 * Con Cloudinary configurado, el navegador sube directo a medigest/dashboard/<sede> con una firma
 * del servidor (asi no pasa por el limite de tamaño de las funciones). Sin Cloudinary (desarrollo
 * local) se guardan en DASHBOARD_UPLOADS_DIR o, por defecto, en ~/.medigest/dashboard-uploads/<sede>,
 * y se sirven por la API con la sesion. Van fuera del proyecto: escribir dentro hace que "next dev"
 * recompile y recargue la pagina en plena subida.
 */
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { MAX_FILE_BYTES } from "@/lib/dashboard/catalog";

/** Tipos permitidos: imagenes, PDF, planillas, documentos, presentaciones, texto y comprimidos. */
const ALLOWED: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".svg": ["image/svg+xml"],
  ".pdf": ["application/pdf"],
  ".csv": ["text/csv", "application/vnd.ms-excel", "text/plain"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED);

/** Mensaje de error en español, o null si el archivo se puede subir. */
export function validateUpload(name: string, mime: string, size: number): string | null {
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED[ext]) return `No se pueden subir archivos ${ext || "sin extensión"}. Usa imágenes, PDF, planillas o documentos.`;
  // Algunos navegadores no informan el tipo (queda vacio): se confia en la extension.
  if (mime && !ALLOWED[ext].includes(mime) && mime !== "application/octet-stream") return "El tipo del archivo no coincide con su extensión.";
  if (size > MAX_FILE_BYTES) return `El archivo pesa ${(size / 1024 / 1024).toFixed(1)} MB. El máximo es ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (size === 0) return "El archivo está vacío.";
  return null;
}

export function mimeFor(name: string) {
  return ALLOWED[path.extname(name).toLowerCase()]?.[0] ?? "application/octet-stream";
}

const root = () => path.resolve(process.env.DASHBOARD_UPLOADS_DIR?.trim() || path.join(os.homedir(), ".medigest", "dashboard-uploads"));
const KEY = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

function localPath(clinicId: string, key: string) {
  if (!KEY.test(key) || !/^[\w-]+$/.test(clinicId)) throw new Error("Archivo no válido.");
  return path.join(root(), clinicId, key);
}

export async function saveLocal(clinicId: string, name: string, bytes: Buffer) {
  const key = `${randomUUID()}${path.extname(name).toLowerCase()}`;
  const file = localPath(clinicId, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return key;
}

export async function readLocal(clinicId: string, key: string) {
  return readFile(localPath(clinicId, key));
}

export async function deleteLocal(clinicId: string, key: string) {
  await unlink(localPath(clinicId, key)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
