// src/server/clinics/ClinicsService.ts
import { prisma } from "@/lib/prisma";

export type ClinicItem = {
  id: string;
  name: string;
  city: string;
};

export class ClinicsService {
  static async listUserActiveClinics(userId: string): Promise<ClinicItem[]> {
    const rows = await prisma.clinicMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        clinic: { isActive: true },
      },
      select: {
        clinic: { select: { id: true, name: true, city: true } },
      },
      orderBy: { clinic: { name: "asc" } },
    });

    // Tipado ok: rows NO es any (prisma está bien importado)
    return rows.map((r) => r.clinic);
  }

  static async selectActiveClinic(userId: string, clinicId: string): Promise<void> {
    const ok = await prisma.clinicMembership.findFirst({
      where: {
        userId,
        clinicId,
        status: "ACTIVE",
        clinic: { isActive: true },
      },
      select: { id: true },
    });

    if (!ok) {
      throw new Error("La clínica no está disponible para este usuario.");
    }
  }
}
