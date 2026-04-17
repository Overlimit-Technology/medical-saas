import { prisma } from "@/lib/prisma";

export type VacationStatus = "pending" | "approved" | "rejected";

export type VacationPayload = {
  startDate: string;
  endDate: string;
  note: string;
  status: VacationStatus;
  reviewerId?: string;
  reviewedAt?: string;
};

export type VacationItem = {
  id: string;
  clinicId: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  note: string;
  status: VacationStatus;
};

const VACATION_REFERENCE_TYPE = "VACATION";
const VACATION_LIMIT_REFERENCE_TYPE = "VACATION_LIMIT";
const DEFAULT_MAX_CONSECUTIVE_DAYS = 15;
const DEFAULT_ANNUAL_DAYS = 15;

type VacationLimitPayload = {
  userId: string;
  maxConsecutiveDays: number;
};

function parsePayload(message: string | null): VacationPayload {
  if (!message) {
    return { startDate: "", endDate: "", note: "", status: "pending" };
  }

  try {
    const parsed = JSON.parse(message) as Partial<VacationPayload>;
    const status = parsed.status === "approved" || parsed.status === "rejected" ? parsed.status : "pending";
    return {
      startDate: parsed.startDate ?? "",
      endDate: parsed.endDate ?? "",
      note: parsed.note ?? "",
      status,
    };
  } catch {
    return { startDate: "", endDate: "", note: message, status: "pending" };
  }
}

function parseLimitPayload(message: string | null): VacationLimitPayload | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message) as Partial<VacationLimitPayload>;
    if (!parsed.userId || typeof parsed.maxConsecutiveDays !== "number") return null;
    return {
      userId: parsed.userId,
      maxConsecutiveDays: parsed.maxConsecutiveDays,
    };
  } catch {
    return null;
  }
}

function countBusinessDaysInclusive(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function toItem(row: {
  id: string;
  clinicId: string;
  createdAt: Date;
  message: string;
  createdBy: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string } | null;
  };
}): VacationItem {
  const payload = parsePayload(row.message);
  const userName = row.createdBy.profile
    ? `${row.createdBy.profile.firstName} ${row.createdBy.profile.lastName}`.trim()
    : row.createdBy.email;

  return {
    id: row.id,
    clinicId: row.clinicId,
    userId: row.createdBy.id,
    userName,
    userEmail: row.createdBy.email,
    createdAt: row.createdAt.toISOString(),
    startDate: payload.startDate,
    endDate: payload.endDate,
    note: payload.note,
    status: payload.status,
  };
}

export class VacationsService {
  static get defaults() {
    return {
      maxConsecutiveDays: DEFAULT_MAX_CONSECUTIVE_DAYS,
      annualDays: DEFAULT_ANNUAL_DAYS,
    };
  }

  static async listByClinic(clinicId: string) {
    const rows = await prisma.internalAlert.findMany({
      where: {
        clinicId,
        referenceType: VACATION_REFERENCE_TYPE,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(toItem);
  }

  static async listOwn(clinicId: string, userId: string) {
    const all = await this.listByClinic(clinicId);
    return all.filter((item) => item.userId === userId);
  }

  static async create(input: {
    clinicId: string;
    userId: string;
    startDate: string;
    endDate: string;
    note: string;
  }) {
    const payload: VacationPayload = {
      startDate: input.startDate,
      endDate: input.endDate,
      note: input.note,
      status: "pending",
    };

    const row = await prisma.internalAlert.create({
      data: {
        clinicId: input.clinicId,
        createdById: input.userId,
        eventType: "CUSTOM",
        title: "Solicitud de vacaciones",
        message: JSON.stringify(payload),
        referenceType: VACATION_REFERENCE_TYPE,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return toItem(row);
  }

  static async updateStatus(input: {
    clinicId: string;
    requestId: string;
    status: VacationStatus;
    reviewerId: string;
  }) {
    const existing = await prisma.internalAlert.findFirst({
      where: {
        id: input.requestId,
        clinicId: input.clinicId,
        referenceType: VACATION_REFERENCE_TYPE,
      },
      select: { id: true, message: true },
    });
    if (!existing) {
      throw new Error("Solicitud no encontrada.");
    }

    const current = parsePayload(existing.message);
    const next = {
      ...current,
      status: input.status,
      reviewerId: input.reviewerId,
      reviewedAt: new Date().toISOString(),
    };

    await prisma.internalAlert.update({
      where: { id: existing.id },
      data: {
        message: JSON.stringify(next),
      },
    });
  }

  static async getMaxConsecutiveDays(clinicId: string, userId: string) {
    const rows = await prisma.internalAlert.findMany({
      where: {
        clinicId,
        referenceType: VACATION_LIMIT_REFERENCE_TYPE,
      },
      orderBy: { updatedAt: "desc" },
      select: { message: true },
    });

    for (const row of rows) {
      const payload = parseLimitPayload(row.message ?? null);
      if (payload?.userId === userId) return payload.maxConsecutiveDays;
    }
    return DEFAULT_MAX_CONSECUTIVE_DAYS;
  }

  static async setMaxConsecutiveDays(input: {
    clinicId: string;
    adminUserId: string;
    userId: string;
    maxConsecutiveDays: number;
  }) {
    const payload: VacationLimitPayload = {
      userId: input.userId,
      maxConsecutiveDays: input.maxConsecutiveDays,
    };

    const existingRows = await prisma.internalAlert.findMany({
      where: {
        clinicId: input.clinicId,
        referenceType: VACATION_LIMIT_REFERENCE_TYPE,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true },
    });

    const existing = existingRows.find((row) => {
      const parsed = parseLimitPayload(row.message);
      return parsed?.userId === input.userId;
    });

    if (existing?.id) {
      await prisma.internalAlert.update({
        where: { id: existing.id },
        data: { message: JSON.stringify(payload), title: "Limite de vacaciones por profesional" },
      });
      return;
    }

    await prisma.internalAlert.create({
      data: {
        clinicId: input.clinicId,
        createdById: input.adminUserId,
        eventType: "CUSTOM",
        title: "Limite de vacaciones por profesional",
        message: JSON.stringify(payload),
        referenceType: VACATION_LIMIT_REFERENCE_TYPE,
      },
    });
  }

  static async getUsedDaysInYear(input: { clinicId: string; userId: string; year: number }) {
    const start = new Date(Date.UTC(input.year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(input.year, 11, 31, 23, 59, 59));
    const rows = await prisma.internalAlert.findMany({
      where: {
        clinicId: input.clinicId,
        createdById: input.userId,
        referenceType: VACATION_REFERENCE_TYPE,
        createdAt: { gte: start, lte: end },
      },
      select: { message: true },
    });

    let total = 0;
    for (const row of rows) {
      const payload = parsePayload(row.message);
      if (payload.status === "rejected") continue;
      total += countBusinessDaysInclusive(payload.startDate, payload.endDate);
    }
    return total;
  }

  static async getVacationSummary(clinicId: string, userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const usedDays = await this.getUsedDaysInYear({ clinicId, userId, year });
    const maxConsecutiveDays = await this.getMaxConsecutiveDays(clinicId, userId);
    const annualDays = DEFAULT_ANNUAL_DAYS;
    const availableDays = Math.max(annualDays - usedDays, 0);
    return {
      year,
      annualDays,
      usedDays,
      availableDays,
      maxConsecutiveDays,
    };
  }

  static async listTeamWithLimits(clinicId: string) {
    const members = await prisma.clinicMembership.findMany({
      where: { clinicId, status: "ACTIVE" },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const items = await Promise.all(
      members.map(async ({ user }) => {
        const summary = await this.getVacationSummary(clinicId, user.id);
        const name = user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
          : user.email;
        return {
          userId: user.id,
          userName: name,
          userEmail: user.email,
          maxConsecutiveDays: summary.maxConsecutiveDays,
          usedDays: summary.usedDays,
          availableDays: summary.availableDays,
          annualDays: summary.annualDays,
        };
      })
    );

    return items.sort((a, b) => a.userName.localeCompare(b.userName));
  }
}
