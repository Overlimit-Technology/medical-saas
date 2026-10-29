import { cookies } from "next/headers";
import type { UserPermission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { readMgSession } from "@/server/auth/mgSession";
import { readMgClinic } from "@/server/clinics/mgClinic";

export type SessionContext = {
  userId: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  clinicId: string;
};

export async function requireAuthSession() {
  const sessionCookie = cookies().get("mg_session")?.value;
  const session = await readMgSession(sessionCookie);
  if (!session) {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function requireClinicSession(): Promise<SessionContext> {
  const session = await requireAuthSession();
  if (session.mustChangePassword) {
    throw new Error("Debes cambiar tu contrasena.");
  }

  const clinicCookie = cookies().get("mg_clinic")?.value;
  const clinic = await readMgClinic(clinicCookie);
  if (clinic && clinic.userId === session.userId) {
    // Una sede suspendida o cancelada por el super admin deja de operar aunque la cookie siga vigente.
    // El super admin no se bloquea: necesita poder reactivarla.
    if (session.isSuperAdmin !== true) {
      const current = await prisma.clinic.findUnique({
        where: { id: clinic.clinicId },
        select: { isActive: true },
      });
      if (!current || !current.isActive) {
        throw new Error("La sede esta suspendida. Contacta a soporte.");
      }
    }
    return {
      userId: session.userId,
      role: session.role,
      isSuperAdmin: session.isSuperAdmin === true,
      permissions: session.permissions ?? [],
      clinicId: clinic.clinicId,
    };
  }

  if (session.isSuperAdmin === true) {
    const fallbackMembership = await prisma.clinicMembership.findFirst({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        clinic: { isActive: true },
      },
      orderBy: [{ clinic: { name: "asc" } }, { createdAt: "asc" }],
      select: { clinicId: true },
    });

    if (fallbackMembership?.clinicId) {
      return {
        userId: session.userId,
        role: session.role,
        isSuperAdmin: true,
        permissions: session.permissions ?? [],
        clinicId: fallbackMembership.clinicId,
      };
    }
  }

  throw new Error("Clinica no seleccionada.");
}

/**
 * Autoriza una accion.
 * - Pasa si el rol esta en `allowed`.
 * - Si no, pasa solo si el usuario tiene concedido (explicitamente) alguno de los permisos indicados.
 * - Un rol sin permisos concedidos nunca pasa por el solo hecho de estar autenticado.
 * Para acciones delicadas (usuarios, borrados) usa solo la lista de roles, sin permiso.
 */
export function requireRole(
  subject: string | { role: string; isSuperAdmin?: boolean; permissions?: string[] },
  allowed: string[],
  permission?: UserPermission | UserPermission[]
) {
  const role = typeof subject === "string" ? subject : subject.role;
  const isSuperAdmin = typeof subject === "string" ? false : subject.isSuperAdmin === true;
  const permissions = typeof subject === "string" ? [] : subject.permissions;
  const permissionList = Array.isArray(permission) ? permission : permission ? [permission] : [];

  if (allowed.includes(role)) return;

  if (permissionList.some((item) => hasPermission(role, permissions, item, isSuperAdmin))) {
    return;
  }

  throw new Error("Acceso denegado.");
}
