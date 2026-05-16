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

export function requireRole(
  subject: string | { role: string; isSuperAdmin?: boolean; permissions?: string[] },
  allowed: string[],
  permission?: UserPermission | UserPermission[]
) {
  const role = typeof subject === "string" ? subject : subject.role;
  const isSuperAdmin = typeof subject === "string" ? false : subject.isSuperAdmin === true;
  const permissions = typeof subject === "string" ? [] : subject.permissions;
  const permissionList = Array.isArray(permission) ? permission : permission ? [permission] : [];

  if (permissionList.length > 0) {
    if (!permissionList.some((item) => hasPermission(role, permissions, item, isSuperAdmin))) {
      throw new Error("Acceso denegado.");
    }
    return;
  }

  if (!allowed.includes(role)) {
    throw new Error("Acceso denegado.");
  }
}
