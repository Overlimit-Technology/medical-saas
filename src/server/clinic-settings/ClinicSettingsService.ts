import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StatusColorInput = Record<string, string>;

export class ClinicSettingsService {
  static async getStatusColors(clinicId: string) {
    const row = await prisma.clinicSettings.findUnique({
      where: { clinicId },
      select: { statusColors: true },
    });
    return (row?.statusColors as StatusColorInput | null) ?? null;
  }

  static async upsertStatusColors(
    clinicId: string,
    statusColors: StatusColorInput
  ) {
    return prisma.clinicSettings.upsert({
      where: { clinicId },
      create: { clinicId, statusColors },
      update: { statusColors },
    });
  }

  static async resetStatusColors(clinicId: string) {
    const existing = await prisma.clinicSettings.findUnique({
      where: { clinicId },
      select: { id: true },
    });
    if (!existing) return;
    await prisma.clinicSettings.update({
      where: { clinicId },
      data: { statusColors: Prisma.DbNull },
    });
  }
}
