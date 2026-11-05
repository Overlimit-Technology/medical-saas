/**
 * Utilidades comunes de las rutas que abren la ficha clinica: respuesta 423 cuando falta el PIN y registro
 * de ediciones sin inundar la tabla (el autoguardado escribe cada pocos segundos).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClinicalLockedError } from "@/server/clinical/clinicalPin";
import { ClinicalAccessService, type ClinicalAccessEntry } from "@/server/clinical/ClinicalAccessService";

const EDIT_LOG_WINDOW_MS = 5 * 60 * 1000;

export function clinicalError(error: unknown, fallback: string) {
  if (error instanceof ClinicalLockedError) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 423 });
  }
  const message = error instanceof Error ? error.message : fallback;
  const lower = message.toLowerCase();
  const status = message === "No autorizado." ? 401 : lower.includes("no encontrada") ? 404 : lower.includes("conflicto") ? 409 : message === "Acceso denegado." ? 403 : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Anota una edicion solo si el mismo usuario no edito ese recurso en los ultimos minutos. */
export async function logEditThrottled(entry: Omit<ClinicalAccessEntry, "action">) {
  const recent = await prisma.clinicalAccessLog.findFirst({
    where: {
      userId: entry.userId,
      action: "EDIT",
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      occurredAt: { gte: new Date(Date.now() - EDIT_LOG_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (!recent) await ClinicalAccessService.log({ ...entry, action: "EDIT" });
}
