import { prisma } from "@/lib/prisma";
import { normalizeId } from "@/lib/normalize";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@prisma/client";
import { ProfessionsService } from "@/server/professions/ProfessionsService";

export type DoctorInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  rut: string;
  specialty?: string | null;
  professionId?: string | null;
  /** "Otra": nombre de una profesion nueva, propia de la sede. */
  professionName?: string | null;
  permissions?: string[];
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
        doctorProfile: { include: { profession: { select: { id: true, name: true } } } },
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
        doctorProfile: { include: { profession: { select: { id: true, name: true } } } },
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
      throw new Error("El RUN ya está registrado.");
    }

    const profession = await ProfessionsService.resolve(input.clinicIds, input);
    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        mustChangePassword: true,
        role: "DOCTOR",
        permissions: input.permissions ?? [],
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
            professionId: profession?.id ?? null,
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
        doctorProfile: { include: { profession: { select: { id: true, name: true } } } },
      },
    });
  }

  /** Sedes activas en las que el usuario tiene membresia (las que puede administrar). */
  static async manageableClinicIds(userId: string) {
    const rows = await prisma.clinicMembership.findMany({
      where: { userId, status: "ACTIVE", clinic: { isActive: true } },
      select: { clinicId: true },
    });
    return rows.map((row) => row.clinicId);
  }

  /** Falla si algun id de sede no esta entre las que el solicitante administra. */
  static async assertClinicsManageable(requesterUserId: string, clinicIds: string[]) {
    const allowed = new Set(await this.manageableClinicIds(requesterUserId));
    if (clinicIds.length === 0 || clinicIds.some((id) => !allowed.has(id))) {
      throw new Error("No tienes acceso a una de las sedes seleccionadas.");
    }
  }

  /** Solo se puede actuar sobre un DOCTOR activo de la sede del solicitante. */
  private static async assertDoctorInClinic(userId: string, clinicId: string) {
    const doctor = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "DOCTOR",
        clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
      },
      select: { id: true },
    });
    if (!doctor) {
      throw new Error("Doctor no encontrado.");
    }
  }

  static async update(
    userId: string,
    clinicId: string,
    input: Partial<DoctorInput>,
    requesterUserId: string
  ) {
    await this.assertDoctorInClinic(userId, clinicId);
    const manageable = await this.manageableClinicIds(requesterUserId);

    if (input.clinicIds) {
      await this.assertClinicsManageable(requesterUserId, input.clinicIds);
    }

    const professionChange =
      input.professionId !== undefined || input.professionName?.trim()
        ? await ProfessionsService.resolve(
            input.clinicIds?.length ? input.clinicIds : [clinicId],
            input
          )
        : undefined;
    if (input.professionId === null && !input.professionName?.trim()) {
      await prisma.doctorProfile.update({ where: { userId }, data: { professionId: null } });
    } else if (professionChange) {
      await prisma.doctorProfile.update({ where: { userId }, data: { professionId: professionChange.id } });
    }

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
        throw new Error("El RUN ya está registrado.");
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
      await this.syncClinics(userId, input.clinicIds, manageable);
    }

    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, doctorProfile: { include: { profession: { select: { id: true, name: true } } } } },
    });
  }

  static async remove(userId: string, clinicId: string) {
    await this.assertDoctorInClinic(userId, clinicId);

    // Si atiende en otras sedes, solo se le retira de esta: su cuenta global no se toca.
    const otherMemberships = await prisma.clinicMembership.count({
      where: { userId, status: "ACTIVE", clinicId: { not: clinicId } },
    });
    if (otherMemberships > 0) {
      await prisma.clinicMembership.updateMany({
        where: { userId, clinicId },
        data: { status: "INACTIVE" },
      });
      return { softDeleted: true, scope: "clinic" as const };
    }

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

  private static async syncClinics(userId: string, clinicIds: string[], manageableClinicIds: string[]) {
    const uniqueIds = Array.from(new Set(clinicIds));

    // Solo se desactivan membresias en sedes que el solicitante administra; las demas no se tocan.
    await prisma.clinicMembership.updateMany({
      where: {
        userId,
        clinicId: { in: manageableClinicIds, notIn: uniqueIds },
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
