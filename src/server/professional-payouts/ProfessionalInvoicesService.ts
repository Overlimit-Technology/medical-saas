import { prisma } from "@/lib/prisma";
import { deriveProfessionalPayoutAmounts } from "@/lib/professional-payouts/calculations";

export type ProfessionalInvoiceStatus = "PENDING" | "ISSUED" | "PAID" | "CANCELLED";

export type ProfessionalInvoiceView = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  month: string;
  monthLabel: string;
  sessionCount: number;
  grossAmount: number;
  clinicPercentage: number;
  clinicRetentionAmount: number;
  baseAmount: number;
  siiPercentage: number;
  siiRetentionAmount: number;
  netAmount: number;
  status: ProfessionalInvoiceStatus;
  invoiceNumber: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  notifiedAt: string | null;
  delegationUntil: string | null;
  delegationActive: boolean;
  receiver: { legalName: string; taxId: string; complete: boolean };
  concept: string;
  legalRatePercent: number | null;
  rateMatchesLegal: boolean;
};

export type CloseMonthRow = {
  doctorId: string;
  sessionCount: number;
  grossAmount: number;
};

// Retencion de boletas de honorarios fijada por la Ley 21.133 (SII).
const LEGAL_SII_RATE_BY_YEAR: Record<number, number> = {
  2026: 15.25,
  2027: 16,
  2028: 17,
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(typeof value === "number" ? value : value.toString());
}

export function formatInvoiceMonthLabel(month: string) {
  const match = MONTH_RE.exec(month);
  if (!match) return month;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function legalRateFor(month: string) {
  const match = MONTH_RE.exec(month);
  if (!match) return null;
  return LEGAL_SII_RATE_BY_YEAR[Number(match[1])] ?? null;
}

function buildName(user: {
  email: string;
  profile: { firstName: string; lastName: string } | null;
}) {
  const full = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim();
  return full || user.email;
}

type InvoiceRecord = Awaited<ReturnType<typeof loadInvoices>>[number];

async function loadInvoices(where: { clinicId: string; month?: string; doctorId?: string }) {
  return prisma.professionalInvoice.findMany({
    where,
    orderBy: [{ month: "desc" }, { createdAt: "asc" }],
    include: {
      doctor: {
        select: {
          email: true,
          profile: { select: { firstName: true, lastName: true } },
          doctorProfile: { select: { specialty: true, siiDelegationUntil: true } },
        },
      },
    },
  });
}

function toView(
  record: InvoiceRecord,
  clinic: { name: string; legalName: string | null; taxId: string | null }
): ProfessionalInvoiceView {
  const delegationUntil = record.doctor.doctorProfile?.siiDelegationUntil ?? null;
  const legalName = clinic.legalName?.trim() || "";
  const taxId = clinic.taxId?.trim() || "";
  const legalRate = legalRateFor(record.month);
  const siiPercentage = toNumber(record.siiPercentage);
  const monthLabel = formatInvoiceMonthLabel(record.month);
  const clinicLabel = legalName || clinic.name;

  return {
    id: record.id,
    doctorId: record.doctorId,
    doctorName: buildName(record.doctor),
    specialty: record.doctor.doctorProfile?.specialty?.trim() ?? "",
    month: record.month,
    monthLabel,
    sessionCount: record.sessionCount,
    grossAmount: toNumber(record.grossAmount),
    clinicPercentage: toNumber(record.clinicPercentage),
    clinicRetentionAmount: toNumber(record.clinicRetentionAmount),
    baseAmount: toNumber(record.baseAmount),
    siiPercentage,
    siiRetentionAmount: toNumber(record.siiRetentionAmount),
    netAmount: toNumber(record.netAmount),
    status: record.status,
    invoiceNumber: record.invoiceNumber,
    issuedAt: record.issuedAt?.toISOString() ?? null,
    paidAt: record.paidAt?.toISOString() ?? null,
    notifiedAt: record.notifiedAt?.toISOString() ?? null,
    delegationUntil: delegationUntil?.toISOString() ?? null,
    delegationActive: delegationUntil !== null && delegationUntil.getTime() > Date.now(),
    receiver: { legalName, taxId, complete: Boolean(legalName && taxId) },
    concept: `Honorarios por servicios profesionales prestados en ${clinicLabel} durante ${monthLabel} (${record.sessionCount} atenciones).`,
    legalRatePercent: legalRate,
    rateMatchesLegal: legalRate === null ? true : Math.abs(legalRate - siiPercentage) < 0.001,
  };
}

export class ProfessionalInvoicesService {
  /**
   * Congela los montos del mes. Las boletas ya emitidas, pagadas o anuladas no se tocan.
   */
  static async closeMonth(input: {
    clinicId: string;
    month: string;
    rows: CloseMonthRow[];
    clinicPercentage: number;
    siiPercentage: number;
  }) {
    if (!MONTH_RE.test(input.month)) {
      throw new Error("Mes invalido. Usa el formato YYYY-MM.");
    }

    const created: string[] = [];

    for (const row of input.rows) {
      if (!(row.grossAmount > 0)) continue;

      const derived = deriveProfessionalPayoutAmounts(
        row.grossAmount,
        input.clinicPercentage,
        input.siiPercentage
      );

      const data = {
        sessionCount: row.sessionCount,
        grossAmount: row.grossAmount,
        clinicPercentage: input.clinicPercentage,
        clinicRetentionAmount: derived.clinicRetentionAmount,
        baseAmount: derived.payoutBaseAmount,
        siiPercentage: input.siiPercentage,
        siiRetentionAmount: derived.siiRetentionAmount,
        netAmount: derived.netAmount,
      };

      const existing = await prisma.professionalInvoice.findUnique({
        where: {
          clinicId_doctorId_month: {
            clinicId: input.clinicId,
            doctorId: row.doctorId,
            month: input.month,
          },
        },
        select: { id: true, status: true },
      });

      if (existing && existing.status !== "PENDING") continue;

      if (existing) {
        await prisma.professionalInvoice.update({ where: { id: existing.id }, data });
        created.push(existing.id);
      } else {
        const record = await prisma.professionalInvoice.create({
          data: { clinicId: input.clinicId, doctorId: row.doctorId, month: input.month, ...data },
          select: { id: true },
        });
        created.push(record.id);
      }
    }

    return created;
  }

  static async markNotified(clinicId: string, month: string, doctorIds: string[]) {
    if (doctorIds.length === 0) return;
    await prisma.professionalInvoice.updateMany({
      where: { clinicId, month, doctorId: { in: doctorIds }, status: "PENDING" },
      data: { notifiedAt: new Date() },
    });
  }

  static async list(input: { clinicId: string; month?: string; doctorId?: string }) {
    const [clinic, records] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: input.clinicId },
        select: { name: true, legalName: true, taxId: true },
      }),
      loadInvoices({
        clinicId: input.clinicId,
        ...(input.month ? { month: input.month } : {}),
        ...(input.doctorId ? { doctorId: input.doctorId } : {}),
      }),
    ]);

    const clinicInfo = clinic ?? { name: "", legalName: null, taxId: null };
    return records.map((record) => toView(record, clinicInfo));
  }

  private static async getOwned(clinicId: string, id: string) {
    const record = await prisma.professionalInvoice.findFirst({
      where: { id, clinicId },
      select: {
        id: true,
        doctorId: true,
        status: true,
        doctor: { select: { doctorProfile: { select: { siiDelegationUntil: true } } } },
      },
    });
    if (!record) throw new Error("Boleta no encontrada.");
    return record;
  }

  /**
   * Registra el numero de la boleta emitida en el SII.
   * Puede hacerlo el propio profesional, un ADMIN, o una SECRETARY si existe delegacion vigente.
   */
  static async markIssued(input: {
    clinicId: string;
    id: string;
    actorUserId: string;
    actorRole: string;
    invoiceNumber: string;
  }) {
    const number = input.invoiceNumber.trim();
    if (!/^\d{1,10}$/.test(number)) {
      throw new Error("El numero de boleta debe tener solo digitos (maximo 10).");
    }

    const record = await this.getOwned(input.clinicId, input.id);
    const isOwner = record.doctorId === input.actorUserId;
    const delegationUntil = record.doctor.doctorProfile?.siiDelegationUntil ?? null;
    const delegationActive = delegationUntil !== null && delegationUntil.getTime() > Date.now();
    const isAdmin = input.actorRole === "ADMIN";
    const isDelegate = input.actorRole === "SECRETARY" && delegationActive;

    if (!isOwner && !isAdmin && !isDelegate) {
      throw new Error("No tienes permiso para registrar esta boleta.");
    }
    if (record.status === "PAID" || record.status === "CANCELLED") {
      throw new Error("La boleta ya esta cerrada y no se puede modificar.");
    }

    await prisma.professionalInvoice.update({
      where: { id: record.id },
      data: {
        status: "ISSUED",
        invoiceNumber: number,
        issuedAt: new Date(),
        issuedByUserId: input.actorUserId,
      },
    });
  }

  /** Solo ADMIN: marcar como pagada, anulada o volver a pendiente. */
  static async setStatus(input: {
    clinicId: string;
    id: string;
    status: "PAID" | "CANCELLED" | "PENDING";
  }) {
    const record = await this.getOwned(input.clinicId, input.id);

    if (input.status === "PAID" && record.status !== "ISSUED") {
      throw new Error("Solo una boleta emitida puede marcarse como pagada.");
    }
    if (record.status === "PAID" && input.status !== "PAID") {
      throw new Error("Una boleta pagada no puede cambiar de estado.");
    }

    await prisma.professionalInvoice.update({
      where: { id: record.id },
      data:
        input.status === "PAID"
          ? { status: "PAID", paidAt: new Date() }
          : input.status === "PENDING"
            ? { status: "PENDING", invoiceNumber: null, issuedAt: null, issuedByUserId: null }
            : { status: "CANCELLED" },
    });
  }

  static async setDelegation(input: { doctorId: string; until: Date | null }) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: input.doctorId },
      select: { id: true },
    });
    if (!profile) throw new Error("Solo los profesionales pueden registrar una delegacion.");

    await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: { siiDelegationUntil: input.until },
    });
  }
}
