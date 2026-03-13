import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeId } from "@/lib/normalize";

export type PatientInput = {
  clinicId: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

const BLOCKING_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;
const NON_BLOCKING_APPOINTMENT_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

export class PatientsService {
  static async list(params: {
    clinicId: string;
    q?: string | null;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const q = params.q?.trim();

    const where: Prisma.PatientWhereInput = {
      clinicId: params.clinicId,
      isActive: true,
    };

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { run: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.patient.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  static async getById(clinicId: string, id: string) {
    return prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        appointments: {
          orderBy: { startAt: "desc" },
          take: 50,
          include: {
            doctor: { include: { profile: true } },
          },
        },
      },
    });
  }

  static async create(input: PatientInput) {
    const runNormalized = normalizeId(input.run);

    const existing = await prisma.patient.findFirst({
      where: { clinicId: input.clinicId, runNormalized },
      select: { id: true, clinicId: true, isActive: true },
    });
    if (existing) {
      if (!existing.isActive) {
        return prisma.patient.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            firstName: input.firstName,
            lastName: input.lastName,
            secondLastName: input.secondLastName ?? null,
            run: input.run,
            runNormalized,
            email: input.email ?? null,
            phone: input.phone ?? null,
            birthDate: input.birthDate ?? null,
            gender: input.gender ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            emergencyContactName: input.emergencyContactName ?? null,
            emergencyContactPhone: input.emergencyContactPhone ?? null,
          },
        });
      }

      throw new Error("El RUN ya esta registrado.");
    }

    return prisma.patient.create({
      data: {
        clinicId: input.clinicId,
        firstName: input.firstName,
        lastName: input.lastName,
        secondLastName: input.secondLastName ?? null,
        run: input.run,
        runNormalized,
        email: input.email ?? null,
        phone: input.phone ?? null,
        birthDate: input.birthDate ?? null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
      },
    });
  }

  static async update(id: string, clinicId: string, input: Partial<PatientInput>) {
    const current = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Paciente no encontrado.");
    }

    const data: Prisma.PatientUpdateInput = {};

    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.secondLastName !== undefined) data.secondLastName = input.secondLastName ?? null;
    if (input.run !== undefined) data.run = input.run;
    if (input.email !== undefined) data.email = input.email ?? null;
    if (input.phone !== undefined) data.phone = input.phone ?? null;
    if (input.birthDate !== undefined) data.birthDate = input.birthDate ?? null;
    if (input.gender !== undefined) data.gender = input.gender ?? null;
    if (input.address !== undefined) data.address = input.address ?? null;
    if (input.city !== undefined) data.city = input.city ?? null;
    if (input.emergencyContactName !== undefined) {
      data.emergencyContactName = input.emergencyContactName ?? null;
    }
    if (input.emergencyContactPhone !== undefined) {
      data.emergencyContactPhone = input.emergencyContactPhone ?? null;
    }

    if (typeof input.run === "string") {
      const runNormalized = normalizeId(input.run);
      const exists = await prisma.patient.findFirst({
        where: {
          clinicId,
          runNormalized,
          NOT: { id },
        },
        select: { id: true },
      });
      if (exists) {
        throw new Error("El RUN ya estÃ¡ registrado. Ingresa un RUN diferente.");
      }
      data.runNormalized = runNormalized;
    }

    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  static async remove(id: string, clinicId: string) {
    const current = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!current) {
      throw new Error("Paciente no encontrado.");
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const hasTodayOrFutureAppointments = await prisma.appointment.count({
      where: {
        patientId: id,
        clinicId,
        startAt: { gte: startOfToday },
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
      },
    });

    if (hasTodayOrFutureAppointments > 0) {
      throw new Error("No se puede eliminar el paciente porque tiene citas de hoy o futuras.");
    }

    const deletedAppointments = await prisma.appointment.deleteMany({
      where: {
        patientId: id,
        clinicId,
        OR: [
          { startAt: { lt: startOfToday } },
          { status: { in: [...NON_BLOCKING_APPOINTMENT_STATUSES] } },
        ],
      },
    });

    try {
      await prisma.patient.delete({ where: { id } });
      return { softDeleted: false, deletedAppointments: deletedAppointments.count };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        await prisma.patient.update({
          where: { id },
          data: { isActive: false },
        });
        return { softDeleted: true, deletedAppointments: deletedAppointments.count };
      }
      throw error;
    }
  }
}

