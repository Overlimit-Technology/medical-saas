import { prisma } from "@/lib/prisma";
import type {
  ProfessionalPayoutMonthResponse,
  ProfessionalPayoutRow,
  ProfessionalPayoutTreatmentBreakdown,
} from "@/domain/professional-payouts/entities/ProfessionalPayout";
import { ClinicSettingsService } from "@/server/clinic-settings/ClinicSettingsService";

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

function parseMonthBounds(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error("Mes invalido. Usa el formato YYYY-MM.");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Mes invalido. Usa el formato YYYY-MM.");
  }

  return {
    from: new Date(year, monthIndex, 1),
    to: new Date(year, monthIndex + 1, 1),
  };
}

function isLiquidableAppointmentStatus(status: string) {
  return status === "COMPLETED" || status === "SCHEDULED" || status === "CONFIRMED";
}

function buildDoctorName(doctor: {
  email: string;
  profile: { firstName: string; lastName: string } | null;
}) {
  const firstName = doctor.profile?.firstName?.trim() ?? "";
  const lastName = doctor.profile?.lastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || doctor.email;
}

type DoctorAccumulator = {
  sessionCount: number;
  grossAmount: number;
  treatments: Map<string, ProfessionalPayoutTreatmentBreakdown>;
};

export class ProfessionalPayoutsService {
  static async getMonthlyPayouts(
    clinicId: string,
    month: string
  ): Promise<ProfessionalPayoutMonthResponse> {
    const { from, to } = parseMonthBounds(month);
    const now = new Date();

    const [settings, doctors, payments] = await Promise.all([
      ClinicSettingsService.getProfessionalPayoutSettings(clinicId),
      prisma.user.findMany({
        where: {
          role: "DOCTOR",
          status: "ACTIVE",
          clinicMemberships: {
            some: {
              clinicId,
              status: "ACTIVE",
            },
          },
        },
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          doctorProfile: {
            select: {
              specialty: true,
            },
          },
        },
      }),
      prisma.paymentHistory.findMany({
        where: {
          status: "PAID",
          appointmentId: { not: null },
          appointment: {
            clinicId,
            startAt: {
              gte: from,
              lt: to,
            },
          },
        },
        select: {
          amount: true,
          appointment: {
            select: {
              id: true,
              doctorId: true,
              status: true,
              startAt: true,
            },
          },
          patientTreatment: {
            select: {
              treatment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const payoutMap = new Map<string, DoctorAccumulator>();

    for (const payment of payments) {
      const appointment = payment.appointment;
      const doctorId = appointment?.doctorId;
      if (!appointment || !doctorId) continue;

      const appointmentStartAt = new Date(appointment.startAt);
      const isPastOrCurrentAppointment = appointmentStartAt.getTime() <= now.getTime();
      if (!isPastOrCurrentAppointment) continue;
      if (!isLiquidableAppointmentStatus(appointment.status)) continue;

      const treatment = payment.patientTreatment.treatment;
      const amount = toNumber(payment.amount);
      const current =
        payoutMap.get(doctorId) ??
        ({
          sessionCount: 0,
          grossAmount: 0,
          treatments: new Map<string, ProfessionalPayoutTreatmentBreakdown>(),
        } satisfies DoctorAccumulator);

      current.sessionCount += 1;
      current.grossAmount += amount;

      const treatmentCurrent = current.treatments.get(treatment.id) ?? {
        treatmentId: treatment.id,
        name: treatment.name,
        sessionCount: 0,
        grossAmount: 0,
      };

      treatmentCurrent.sessionCount += 1;
      treatmentCurrent.grossAmount += amount;
      current.treatments.set(treatment.id, treatmentCurrent);
      payoutMap.set(doctorId, current);
    }

    const professionals: ProfessionalPayoutRow[] = doctors.map((doctor) => {
      const summary = payoutMap.get(doctor.id);
      const treatments = Array.from(summary?.treatments.values() ?? []).map((item) => ({
        ...item,
        grossAmount: Number(item.grossAmount.toFixed(2)),
      }));

      treatments.sort((left, right) => {
        if (right.grossAmount !== left.grossAmount) {
          return right.grossAmount - left.grossAmount;
        }
        return left.name.localeCompare(right.name, "es");
      });

      return {
        doctorId: doctor.id,
        name: buildDoctorName(doctor),
        specialty: doctor.doctorProfile?.specialty?.trim() ?? "",
        sessionCount: summary?.sessionCount ?? 0,
        grossAmount: Number((summary?.grossAmount ?? 0).toFixed(2)),
        treatments,
      };
    });

    return {
      settings,
      professionals,
    };
  }
}
