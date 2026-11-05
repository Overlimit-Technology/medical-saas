/**
 * Registro de accesos a la ficha clinica (Ley 20.584, art. 13: quien accede, cuando y a que).
 * Cada apertura, edicion, cierre, exportacion y desbloqueo con PIN queda anotado aqui.
 * Nunca guarda contenido clinico: solo el tipo de acceso y el recurso.
 */
import { prisma } from "@/lib/prisma";

export type ClinicalAccessAction = "OPEN" | "VIEW" | "EDIT" | "CLOSE" | "EXPORT" | "PIN_OK" | "PIN_FAIL" | "PIN_SET" | "LOCK";

export type ClinicalAccessEntry = {
  clinicId: string;
  patientId: string;
  userId: string;
  action: ClinicalAccessAction;
  resource: string;
  resourceId?: string | null;
  req?: Request;
};

function clientIp(req?: Request) {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim().slice(0, 64) || null;
}

export class ClinicalAccessService {
  static async log(entry: ClinicalAccessEntry) {
    try {
      await prisma.clinicalAccessLog.create({
        data: {
          clinicId: entry.clinicId,
          patientId: entry.patientId,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          ip: clientIp(entry.req),
          userAgent: entry.req?.headers.get("user-agent")?.slice(0, 200) ?? null,
        },
      });
    } catch (error) {
      // El registro no debe tumbar la atencion, pero si quedar a la vista en los logs del servidor.
      console.error("[clinical-access] no se pudo registrar el acceso", error);
    }
  }

  /** Ultimos accesos a la ficha de un paciente, con el nombre de quien entro. */
  static async listForPatient(clinicId: string, patientId: string, take = 100) {
    const rows = await prisma.clinicalAccessLog.findMany({
      where: { clinicId, patientId },
      orderBy: { occurredAt: "desc" },
      take,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set(rows.map((r) => r.userId))) } },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
    });
    const names = new Map(users.map((u) => [u.id, u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : u.email]));
    return rows.map((r) => ({ ...r, userName: names.get(r.userId) ?? "Usuario eliminado" }));
  }
}
