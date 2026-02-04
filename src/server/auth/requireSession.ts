import { cookies } from "next/headers";
import { readMgSession } from "@/server/auth/mgSession";
import { readMgClinic } from "@/server/clinics/mgClinic";

export type SessionContext = {
  userId: string;
  role: string;
  clinicId: string;
};

export async function requireClinicSession(): Promise<SessionContext> {
  const sessionCookie = cookies().get("mg_session")?.value;
  const session = await readMgSession(sessionCookie);
  if (!session) {
    throw new Error("Unauthorized");
  }

  const clinicCookie = cookies().get("mg_clinic")?.value;
  const clinic = await readMgClinic(clinicCookie);
  if (!clinic || clinic.userId !== session.userId) {
    throw new Error("ClinicNotSelected");
  }

  return {
    userId: session.userId,
    role: session.role,
    clinicId: clinic.clinicId,
  };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error("Forbidden");
  }
}
