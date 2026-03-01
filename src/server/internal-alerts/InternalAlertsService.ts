import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";
import { sendEmail } from "@/server/notifications/email";

const CREATOR_ROLES = ["ADMIN", "SECRETARY"] as const;
type CreatorRole = (typeof CREATOR_ROLES)[number];

const INTERNAL_ALERT_TYPES = [
  "APPOINTMENT_CREATED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_CONFLICT",
  "PAYMENT_PENDING",
  "CUSTOM",
] as const;

export type InternalAlertTypeValue = (typeof INTERNAL_ALERT_TYPES)[number];

type CreateInternalAlertInput = {
  origin: string;
  clinicId: string;
  actorUserId: string;
  actorRole: string;
  title: string;
  message: string;
  doctorId?: string | null;
  eventType?: InternalAlertTypeValue;
  referenceType?: string | null;
  referenceId?: string | null;
  targetRoles?: Array<"ADMIN" | "DOCTOR" | "SECRETARY">;
  includeActor?: boolean;
};

type CandidateRecipient = {
  userId: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "SECRETARY";
  firstName: string | null;
  lastName: string | null;
  canReceive: boolean;
  skipReason?: string;
};

function toAuditDetail(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function normalizeEventType(value?: string | null): InternalAlertTypeValue {
  if (!value) return "CUSTOM";
  return INTERNAL_ALERT_TYPES.includes(value as InternalAlertTypeValue)
    ? (value as InternalAlertTypeValue)
    : "CUSTOM";
}

function formatEventTypeLabel(eventType: InternalAlertTypeValue) {
  switch (eventType) {
    case "APPOINTMENT_CREATED":
      return "Cita creada";
    case "APPOINTMENT_RESCHEDULED":
      return "Cita reagendada";
    case "APPOINTMENT_CANCELLED":
      return "Cita cancelada";
    case "APPOINTMENT_CONFLICT":
      return "Conflicto de agenda";
    case "PAYMENT_PENDING":
      return "Cobro/Pago pendiente";
    default:
      return "Alerta interna";
  }
}

function buildRecipientName(firstName: string | null, lastName: string | null, fallback: string) {
  const fullName = [firstName ?? "", lastName ?? ""].join(" ").trim();
  return fullName || fallback;
}

export class InternalAlertsService {
  static async createAndDispatch(input: CreateInternalAlertInput) {
    const actorRole = input.actorRole as CreatorRole;
    if (!CREATOR_ROLES.includes(actorRole)) {
      throw new Error("Solo ADMIN y SECRETARY pueden generar alertas internas.");
    }

    const title = input.title.trim();
    const message = input.message.trim();
    if (!title || !message) {
      throw new Error("La alerta interna requiere titulo y mensaje.");
    }

    const eventType = normalizeEventType(input.eventType);
    const recipientResolution = await this.resolveRecipients({
      actorRole,
      actorUserId: input.actorUserId,
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      targetRoles: input.targetRoles,
      includeActor: input.includeActor ?? false,
    });

    const alert = await prisma.$transaction(async (tx) => {
      const createdAlert = await tx.internalAlert.create({
        data: {
          clinicId: input.clinicId,
          createdById: input.actorUserId,
          doctorId: recipientResolution.doctorRecipientId,
          eventType,
          title,
          message,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
        },
      });

      if (recipientResolution.recipients.length > 0) {
        await tx.internalAlertRecipient.createMany({
          data: recipientResolution.recipients.map((recipient) => ({
            alertId: createdAlert.id,
            userId: recipient.userId,
            deliveryStatus: recipient.canReceive ? "PENDING" : "SKIPPED",
            deliveryError: recipient.canReceive
              ? null
              : recipient.skipReason ?? "El destinatario no cumple las reglas de sede.",
          })),
          skipDuplicates: true,
        });
      }

      return createdAlert;
    });

    await AuditService.log(
      "internal_alert.created",
      input.actorUserId,
      toAuditDetail({
        alertId: alert.id,
        clinicId: input.clinicId,
        actorRole,
        eventType,
        recipients: recipientResolution.recipients.length,
      })
    );

    if (recipientResolution.externalSkipDetails.length > 0) {
      await Promise.all(
        recipientResolution.externalSkipDetails.map((detail) =>
          AuditService.log("internal_alert.delivery.skipped", input.actorUserId, detail)
        )
      );
    }

    const skippedRecipients = recipientResolution.recipients.filter((recipient) => !recipient.canReceive);
    if (skippedRecipients.length > 0) {
      await Promise.all(
        skippedRecipients.map((recipient) =>
          AuditService.log(
            "internal_alert.delivery.skipped",
            input.actorUserId,
            toAuditDetail({
              alertId: alert.id,
              recipientUserId: recipient.userId,
              role: recipient.role,
              clinicId: input.clinicId,
              reason: recipient.skipReason ?? "No pertenece a la sede del evento.",
            })
          )
        )
      );
    }

    const clinicLabel = await resolveSingleClinicLabel(input.clinicId);
    const actorLabel = actorRole === "ADMIN" ? "Administrador" : "Secretaria";
    const deliverableRecipients = recipientResolution.recipients.filter((recipient) => recipient.canReceive);

    const deliveryResults = await Promise.all(
      deliverableRecipients.map(async (recipient) => {
        const subject = `[Alerta interna] ${title}`;
        const text = [
          `Hola ${buildRecipientName(recipient.firstName, recipient.lastName, recipient.email)},`,
          "",
          "Se genero una alerta interna en ZENSYA.",
          `Sede del evento: ${clinicLabel}`,
          `Tipo: ${formatEventTypeLabel(eventType)}`,
          `Detalle: ${message}`,
          `Generada por: ${actorLabel}`,
          "",
          "Este mensaje es solo para usuarios internos del sistema.",
        ].join("\n");

        const result = await sendEmail({
          origin: input.origin,
          to: recipient.email,
          subject,
          text,
        });

        if (!result.ok) {
          await prisma.internalAlertRecipient.updateMany({
            where: {
              alertId: alert.id,
              userId: recipient.userId,
            },
            data: {
              deliveryStatus: "FAILED",
              deliveryError: result.error,
              deliveredAt: null,
            },
          });

          await AuditService.log(
            "internal_alert.delivery.failed",
            input.actorUserId,
            toAuditDetail({
              alertId: alert.id,
              recipientUserId: recipient.userId,
              clinicId: input.clinicId,
              reason: result.error,
            })
          );

          return { status: "FAILED" as const, error: result.error };
        }

        await prisma.internalAlertRecipient.updateMany({
          where: {
            alertId: alert.id,
            userId: recipient.userId,
          },
          data: {
            deliveryStatus: "SENT",
            deliveryError: null,
            deliveredAt: new Date(),
          },
        });

        return { status: "SENT" as const };
      })
    );

    const sentCount = deliveryResults.filter((result) => result.status === "SENT").length;
    const failed = deliveryResults.filter((result) => result.status === "FAILED");
    const failedCount = failed.length;

    return {
      alertId: alert.id,
      sentCount,
      failedCount,
      skippedCount: skippedRecipients.length + recipientResolution.externalSkipDetails.length,
      warning:
        failedCount > 0
          ? failed
              .map((result) => ("error" in result ? result.error : "No se pudo enviar el correo."))
              .join(" | ")
          : null,
    };
  }

  static async listForUser(userId: string) {
    const rows = await prisma.internalAlertRecipient.findMany({
      where: { userId },
      include: {
        alert: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            doctor: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        alert: {
          createdAt: "desc",
        },
      },
    });

    return rows.map((row) => ({
      id: row.alert.id,
      recipientId: row.id,
      eventType: row.alert.eventType,
      title: row.alert.title,
      message: row.alert.message,
      referenceType: row.alert.referenceType,
      referenceId: row.alert.referenceId,
      clinic: {
        id: row.alert.clinic.id,
        name: row.alert.clinic.name,
        city: row.alert.clinic.city,
      },
      createdAt: row.alert.createdAt,
      createdBy: {
        id: row.alert.createdBy.id,
        email: row.alert.createdBy.email,
        role: row.alert.createdBy.role,
        firstName: row.alert.createdBy.profile?.firstName ?? null,
        lastName: row.alert.createdBy.profile?.lastName ?? null,
      },
      doctor: row.alert.doctor
        ? {
            id: row.alert.doctor.id,
            email: row.alert.doctor.email,
            firstName: row.alert.doctor.profile?.firstName ?? null,
            lastName: row.alert.doctor.profile?.lastName ?? null,
          }
        : null,
      deliveryStatus: row.deliveryStatus,
      deliveryError: row.deliveryError,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      isRead: Boolean(row.readAt),
    }));
  }

  static async markAsRead(alertId: string, userId: string) {
    const updated = await prisma.internalAlertRecipient.updateMany({
      where: {
        alertId,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    if (updated.count > 0) return true;

    const exists = await prisma.internalAlertRecipient.findFirst({
      where: {
        alertId,
        userId,
      },
      select: {
        id: true,
      },
    });
    return Boolean(exists);
  }

  private static async resolveRecipients(input: {
    actorRole: CreatorRole;
    actorUserId: string;
    clinicId: string;
    doctorId?: string | null;
    targetRoles?: Array<"ADMIN" | "DOCTOR" | "SECRETARY">;
    includeActor: boolean;
  }): Promise<{
    recipients: CandidateRecipient[];
    doctorRecipientId: string | null;
    externalSkipDetails: string[];
  }> {
    const recipientsById = new Map<string, CandidateRecipient>();
    const externalSkipDetails: string[] = [];

    const addAdmins = async () => {
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      for (const user of admins) {
        recipientsById.set(user.id, {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.profile?.firstName ?? null,
          lastName: user.profile?.lastName ?? null,
          canReceive: true,
        });
      }
    };

    const addSecretaries = async () => {
      const secretaries = await prisma.user.findMany({
        where: {
          role: "SECRETARY",
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          clinicMemberships: {
            where: {
              clinicId: input.clinicId,
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          },
        },
      });

      for (const user of secretaries) {
        const hasMembership = user.clinicMemberships.length > 0;
        recipientsById.set(user.id, {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.profile?.firstName ?? null,
          lastName: user.profile?.lastName ?? null,
          canReceive: hasMembership,
          skipReason: hasMembership ? undefined : "Secretaria sin membresia activa en la sede del evento.",
        });
      }
    };

    let doctorRecipientId: string | null = null;
    let doctorCandidate: CandidateRecipient | null = null;
    if (input.doctorId) {
      const doctor = await prisma.user.findFirst({
        where: {
          id: input.doctorId,
          role: "DOCTOR",
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          role: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          clinicMemberships: {
            where: {
              clinicId: input.clinicId,
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!doctor) {
        externalSkipDetails.push(
          toAuditDetail({
            clinicId: input.clinicId,
            doctorId: input.doctorId,
            reason: "Doctor no encontrado o inactivo.",
          })
        );
      } else {
        const hasMembership = doctor.clinicMemberships.length > 0;
        doctorRecipientId = doctor.id;
        doctorCandidate = {
          userId: doctor.id,
          email: doctor.email,
          role: doctor.role,
          firstName: doctor.profile?.firstName ?? null,
          lastName: doctor.profile?.lastName ?? null,
          canReceive: hasMembership,
          skipReason: hasMembership ? undefined : "Doctor sin membresia activa en la sede del evento.",
        };
      }
    }

    const explicitTargets = input.targetRoles?.length ? Array.from(new Set(input.targetRoles)) : null;

    if (explicitTargets) {
      if (explicitTargets.includes("ADMIN")) {
        await addAdmins();
      }
      if (explicitTargets.includes("SECRETARY")) {
        await addSecretaries();
      }
      if (explicitTargets.includes("DOCTOR")) {
        if (doctorCandidate) {
          recipientsById.set(doctorCandidate.userId, doctorCandidate);
        } else {
          externalSkipDetails.push(
            toAuditDetail({
              clinicId: input.clinicId,
              reason: "Se solicito notificar doctor, pero no hay doctor asociado valido.",
            })
          );
        }
      }
    } else {
      if (input.actorRole === "ADMIN") {
        await addSecretaries();
      } else {
        await addAdmins();
      }
      if (doctorCandidate) {
        recipientsById.set(doctorCandidate.userId, doctorCandidate);
      }
    }

    if (!input.includeActor) {
      recipientsById.delete(input.actorUserId);
    }

    return {
      recipients: Array.from(recipientsById.values()),
      doctorRecipientId,
      externalSkipDetails,
    };
  }
}
