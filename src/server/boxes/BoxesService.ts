import { prisma } from "@/lib/prisma";

const FUTURE_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

export class BoxesService {
  static async list(clinicId: string) {
    return prisma.box.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  static async create(clinicId: string, name: string) {
    return prisma.box.create({
      data: { clinicId, name },
    });
  }

  static async update(id: string, clinicId: string, name: string) {
    const current = await prisma.box.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Box not found");
    }

    return prisma.box.update({
      where: { id },
      data: { name },
    });
  }

  static async remove(id: string, clinicId: string) {
    const current = await prisma.box.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Box not found");
    }

    const now = new Date();
    const hasFuture = await prisma.appointment.count({
      where: {
        boxId: id,
        clinicId,
        startAt: { gt: now },
        status: { in: [...FUTURE_APPOINTMENT_STATUSES] },
      },
    });

    if (hasFuture > 0) {
      await prisma.box.update({
        where: { id },
        data: { isActive: false },
      });
      return { softDeleted: true };
    }

    await prisma.box.delete({ where: { id } });
    return { softDeleted: false };
  }
}
