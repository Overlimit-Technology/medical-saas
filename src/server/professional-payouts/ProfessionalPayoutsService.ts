import { prisma } from "@/lib/prisma";
import type {
  ProfessionalPayoutEmailDispatchResult,
  ProfessionalPayoutMonthResponse,
  ProfessionalPayoutRow,
  ProfessionalPayoutTreatmentBreakdown,
} from "@/domain/professional-payouts/entities/ProfessionalPayout";
import { deriveProfessionalPayoutAmounts } from "@/lib/professional-payouts/calculations";
import { ClinicSettingsService } from "@/server/clinic-settings/ClinicSettingsService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { sendEmail } from "@/server/notifications/email";
import { resolveEmailTemplate } from "@/server/notifications/emailTemplates";

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

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

type DoctorAccumulator = {
  sessionCount: number;
  grossAmount: number;
  treatments: Map<string, ProfessionalPayoutTreatmentBreakdown>;
};

type ProfessionalPayoutDoctorRow = ProfessionalPayoutRow & {
  email: string;
};

export class ProfessionalPayoutsService {
  private static async getMonthlyPayoutRows(
    clinicId: string,
    month: string
  ): Promise<{
    settings: ProfessionalPayoutMonthResponse["settings"];
    professionals: ProfessionalPayoutDoctorRow[];
  }> {
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

    const professionals: ProfessionalPayoutDoctorRow[] = doctors.map((doctor) => {
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
        email: doctor.email,
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

  static async getMonthlyPayouts(
    clinicId: string,
    month: string
  ): Promise<ProfessionalPayoutMonthResponse> {
    const result = await this.getMonthlyPayoutRows(clinicId, month);

    return {
      settings: result.settings,
      professionals: result.professionals.map((professional) => ({
        doctorId: professional.doctorId,
        name: professional.name,
        specialty: professional.specialty,
        sessionCount: professional.sessionCount,
        grossAmount: professional.grossAmount,
        treatments: professional.treatments,
      })),
    };
  }

  static async sendMonthlyPayoutEmails(input: {
    clinicId: string;
    month: string;
    origin: string;
  }): Promise<ProfessionalPayoutEmailDispatchResult> {
    const [{ settings, professionals }, clinicLabel] = await Promise.all([
      this.getMonthlyPayoutRows(input.clinicId, input.month),
      resolveSingleClinicLabel(input.clinicId),
    ]);

    const monthLabel = formatMonthLabel(input.month);
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const professional of professionals) {
      const recipientEmail = professional.email.trim();
      if (!recipientEmail) {
        skippedCount += 1;
        errors.push(`${professional.name}: sin correo configurado.`);
        continue;
      }

      const derived = deriveProfessionalPayoutAmounts(
        professional.grossAmount,
        settings.clinicPercentage,
        settings.siiPercentage
      );

      const tpl = await resolveEmailTemplate(input.clinicId, "PROFESSIONAL_PAYOUT", {
        professionalName: professional.name,
        month: monthLabel,
        clinicName: clinicLabel,
        grossAmount: formatCurrency(professional.grossAmount),
        clinicRetention: formatCurrency(derived.clinicRetentionAmount),
        siiRetention: formatCurrency(derived.siiRetentionAmount),
        netAmount: formatCurrency(derived.netAmount),
      });

      if (!tpl.enabled) {
        skippedCount += 1;
        continue;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
          <p>Hola ${professional.name},</p>
          <p>Te compartimos tu resumen de liquidacion correspondiente a <strong>${monthLabel}</strong>.</p>
          <p style="margin: 0 0 16px;">Sede: <strong>${clinicLabel}</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tbody>
              <tr>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">Total recaudado</td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: right;"><strong>${formatCurrency(
                  professional.grossAmount
                )}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">Clinica (${formatPercentage(
                  settings.clinicPercentage
                )})</td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(
                  derived.clinicRetentionAmount
                )}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">SII (${formatPercentage(
                  settings.siiPercentage
                )})</td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(
                  derived.siiRetentionAmount
                )}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; background: #f8fafc;">Total estimado a pagar (${formatPercentage(
                  derived.netPercentage
                )})</td>
                <td style="padding: 10px 12px; border: 1px solid #cbd5e1; background: #f8fafc; text-align: right; color: #0f9ea8;"><strong>${formatCurrency(
                  derived.netAmount
                )}</strong></td>
              </tr>
            </tbody>
          </table>
          <p>Si necesitas revisar el detalle, por favor contacta a la clinica.</p>
        </div>
      `;

      const result = await sendEmail({
        origin: input.origin,
        to: recipientEmail,
        subject: tpl.subject,
        text: tpl.body,
        html,
      });

      if (!result.ok) {
        failedCount += 1;
        errors.push(`${professional.name}: ${result.error}`);
        continue;
      }

      sentCount += 1;
    }

    return {
      sentCount,
      failedCount,
      skippedCount,
      warning: errors.length > 0 ? errors.join(" | ") : null,
    };
  }
}
