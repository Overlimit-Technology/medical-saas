import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StatusColorInput = Record<string, string>;
export type ProfessionalPayoutSettingsInput = {
  clinicPercentage: number;
  siiPercentage: number;
};

function toPercentageNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(typeof value === "number" ? value : value.toString());
}

function toDecimalPercentage(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

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

  static async getProfessionalPayoutSettings(clinicId: string): Promise<ProfessionalPayoutSettingsInput> {
    const row = await prisma.clinicSettings.findUnique({
      where: { clinicId },
      select: {
        professionalPayoutClinicPercentage: true,
        professionalPayoutSiiPercentage: true,
      },
    });

    return {
      clinicPercentage: toPercentageNumber(row?.professionalPayoutClinicPercentage),
      siiPercentage: toPercentageNumber(row?.professionalPayoutSiiPercentage),
    };
  }

  static async upsertProfessionalPayoutSettings(
    clinicId: string,
    settings: ProfessionalPayoutSettingsInput
  ) {
    return prisma.clinicSettings.upsert({
      where: { clinicId },
      create: {
        clinicId,
        professionalPayoutClinicPercentage: toDecimalPercentage(settings.clinicPercentage),
        professionalPayoutSiiPercentage: toDecimalPercentage(settings.siiPercentage),
      },
      update: {
        professionalPayoutClinicPercentage: toDecimalPercentage(settings.clinicPercentage),
        professionalPayoutSiiPercentage: toDecimalPercentage(settings.siiPercentage),
      },
    });
  }
}
