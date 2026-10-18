import { prisma } from "@/lib/prisma";
import { InternalAlertsService } from "@/server/internal-alerts/InternalAlertsService";
import { sendEmail } from "@/server/notifications/email";
import { resolveEmailTemplate } from "@/server/notifications/emailTemplates";

type NotifyInput = {
  clinicId: string;
  clinicName: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientEmail: string | null;
  when: string;
  origin: string;
};

/**
 * Avisa a recepcion (alerta interna) y confirma por correo al paciente.
 * Las alertas internas exigen un usuario de la sede como autor: se usa el primer ADMIN o SECRETARY activo.
 */
export async function notifyOnlineBooking(input: NotifyInput) {
  try {
    const actor = await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        role: { in: ["ADMIN", "SECRETARY"] },
        clinicMemberships: { some: { clinicId: input.clinicId, status: "ACTIVE" } },
      },
      select: { id: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    if (actor) {
      await InternalAlertsService.createAndDispatch({
        origin: input.origin,
        clinicId: input.clinicId,
        actorUserId: actor.id,
        actorRole: actor.role,
        doctorId: input.doctorId,
        eventType: "APPOINTMENT_CREATED",
        title: "Nueva reserva online",
        message: `Paciente: ${input.patientName}. Doctor: ${input.doctorName}. Fecha: ${input.when}. Reserva hecha desde la web, falta confirmarla.`,
        referenceType: "APPOINTMENT",
        referenceId: input.appointmentId,
        dispatchEmail: false,
      });
    }
  } catch {
    // La reserva ya esta creada; un fallo de alerta no debe afectar al paciente.
  }

  if (!input.patientEmail) return;

  try {
    const tpl = await resolveEmailTemplate(input.clinicId, "APPOINTMENT_CONFIRMATION", {
      patientName: input.patientName,
      doctorName: input.doctorName,
      dateTime: input.when,
      clinicName: input.clinicName,
    });
    if (tpl.enabled) {
      await sendEmail({
        origin: input.origin,
        to: input.patientEmail,
        subject: tpl.subject,
        html: tpl.body,
      });
    }
  } catch {
    // Sin correo la reserva sigue siendo valida.
  }
}
