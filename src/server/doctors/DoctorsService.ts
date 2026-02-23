import { prisma } from "@/lib/prisma";
import { normalizeId } from "@/lib/normalize";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@prisma/client";

export type DoctorInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  rut: string;
  specialty?: string | null;
  clinicIds: string[];
};

const FUTURE_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

export class DoctorsService {
  static async list(clinicId: string) {
    return prisma.user.findMany({
      where: {
        role: "DOCTOR",
        status: "ACTIVE",
        doctorProfile: {
          is: { isActive: true },
        },
        clinicMemberships: {
          some: { clinicId, status: "ACTIVE" },
        },
      },
      include: {
        profile: true,
        doctorProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async listForUser(clinicId: string, userId: string) {
    const item = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "DOCTOR",
        status: "ACTIVE",
        doctorProfile: {
          is: { isActive: true },
        },
        clinicMemberships: {
          some: { clinicId, status: "ACTIVE" },
        },
      },
      include: {
        profile: true,
        doctorProfile: true,
      },
    });

    return item ? [item] : [];
  }

  static async create(input: DoctorInput) {
    const rutNormalized = normalizeId(input.rut);
    const existingRut = await prisma.doctorProfile.findFirst({
      where: { rutNormalized },
      select: { id: true },
    });
    if (existingRut) {
      throw new Error("El RUT ya está registrado.");
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        mustChangePassword: true,
        role: "DOCTOR",
        status: "ACTIVE",
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
          },
        },
        doctorProfile: {
          create: {
            rut: input.rut,
            rutNormalized,
            specialty: input.specialty ?? null,
          },
        },
        clinicMemberships: {
          create: input.clinicIds.map((clinicId) => ({
            clinicId,
            status: "ACTIVE",
          })),
        },
      },
      include: {
        profile: true,
        doctorProfile: true,
      },
    });
  }

  static async update(userId: string, clinicId: string, input: Partial<DoctorInput>) {
    if (input.rut) {
      const rutNormalized = normalizeId(input.rut);
      const exists = await prisma.doctorProfile.findFirst({
        where: {
          rutNormalized,
          NOT: { userId },
        },
        select: { id: true },
      });
      if (exists) {
        throw new Error("El RUT ya está registrado.");
      }

      await prisma.doctorProfile.update({
        where: { userId },
        data: {
          rut: input.rut,
          rutNormalized,
          specialty: input.specialty ?? undefined,
        },
      });
    } else if (input.specialty !== undefined) {
      await prisma.doctorProfile.update({
        where: { userId },
        data: { specialty: input.specialty ?? null },
      });
    }

    if (input.firstName || input.lastName || input.phone !== undefined) {
      await prisma.userProfile.update({
        where: { userId },
        data: {
          firstName: input.firstName ?? undefined,
          lastName: input.lastName ?? undefined,
          phone: input.phone ?? null,
        },
      });
    }

    if (input.clinicIds) {
      await this.syncClinics(userId, input.clinicIds);
    } else {
      await this.ensureClinic(userId, clinicId);
    }

    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, doctorProfile: true },
    });
  }

  static async remove(userId: string, clinicId: string) {
    const softDeleteDoctor = async () => {
      await prisma.doctorProfile.update({
        where: { userId },
        data: { isActive: false },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED" },
      });
      return { softDeleted: true };
    };

    const now = new Date();
    const hasFuture = await prisma.appointment.count({
      where: {
        doctorId: userId,
        clinicId,
        startAt: { gt: now },
        status: { in: [...FUTURE_APPOINTMENT_STATUSES] },
      },
    });

    if (hasFuture > 0) {
      return softDeleteDoctor();
    }

    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return softDeleteDoctor();
      }
      throw error;
    }

    return { softDeleted: false };
  }

  private static async ensureClinic(userId: string, clinicId: string) {
    await prisma.clinicMembership.upsert({
      where: { userId_clinicId: { userId, clinicId } },
      update: { status: "ACTIVE" },
      create: { userId, clinicId, status: "ACTIVE" },
    });
  }

  private static async syncClinics(userId: string, clinicIds: string[]) {
    const uniqueIds = Array.from(new Set(clinicIds));

    await prisma.clinicMembership.updateMany({
      where: {
        userId,
        clinicId: { notIn: uniqueIds },
      },
      data: { status: "INACTIVE" },
    });

    await Promise.all(
      uniqueIds.map((clinicId) =>
        prisma.clinicMembership.upsert({
          where: { userId_clinicId: { userId, clinicId } },
          update: { status: "ACTIVE" },
          create: { userId, clinicId, status: "ACTIVE" },
        })
      )
    );
  }
}
