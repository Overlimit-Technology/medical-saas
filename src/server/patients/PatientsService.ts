import { prisma } from "@/lib/prisma";
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

const FUTURE_APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

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

    const where: any = {
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
          take: 10,
        },
      },
    });
  }

  static async create(input: PatientInput) {
    const runNormalized = normalizeId(input.run);

    const exists = await prisma.patient.findFirst({
      where: { runNormalized },
      select: { id: true },
    });
    if (exists) {
      throw new Error("RUN already exists");
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
      throw new Error("Patient not found");
    }

    const data: any = {
      ...input,
    };

    if (typeof input.run === "string") {
      const runNormalized = normalizeId(input.run);
      const exists = await prisma.patient.findFirst({
        where: {
          runNormalized,
          NOT: { id },
        },
        select: { id: true },
      });
      if (exists) {
        throw new Error("RUN already exists");
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
      throw new Error("Patient not found");
    }

    const now = new Date();
    const hasFuture = await prisma.appointment.count({
      where: {
        patientId: id,
        clinicId,
        startAt: { gt: now },
        status: { in: [...FUTURE_APPOINTMENT_STATUSES] },
      },
    });

    if (hasFuture > 0) {
      throw new Error("Patient has future appointments");
    }

    await prisma.patient.delete({ where: { id } });
  }
}
