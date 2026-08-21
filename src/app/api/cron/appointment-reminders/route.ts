import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/notifications/email";
import { resolveEmailTemplate } from "@/server/notifications/emailTemplates";

/**
 * GET /api/cron/appointment-reminders
 *
 * Envía recordatorios 24h antes de cada cita.
 * Debe ser llamado diariamente por un cron (ej. Vercel Cron, cron-job.org).
 * Requiere header: x-cron-secret = CRON_SECRET del .env
 *
 * Vercel cron config en vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/appointment-reminders", "schedule": "0 10 * * *" }]
 * }
 */
export async function GET(req: Request) {
  // Validar secret para evitar llamadas no autorizadas
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const now = new Date();

  // Ventana: citas que empiezan entre 23h y 25h desde ahora
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: windowStart, lte: windowEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      patient: { email: { not: null } },
    },
    include: {
      patient: { select: { email: true, firstName: true, lastName: true, secondLastName: true } },
      doctor: { include: { profile: { select: { firstName: true, lastName: true } } } },
    },
  });

  // Pre-cargar nombres de clínicas en batch para evitar N queries
  const clinicIds = Array.from(new Set(appointments.map((a) => a.clinicId)));
  const clinics = await prisma.clinic.findMany({
    where: { id: { in: clinicIds } },
    select: { id: true, name: true },
  });
  const clinicNameMap = new Map(clinics.map((c) => [c.id, c.name]));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const appt of appointments) {
    const patientEmail = appt.patient.email;
    if (!patientEmail) {
      skipped++;
      continue;
    }

    const patientName = [appt.patient.firstName, appt.patient.lastName, appt.patient.secondLastName ?? ""]
      .join(" ")
      .trim();
    const doctorName = [appt.doctor.profile?.firstName ?? "", appt.doctor.profile?.lastName ?? ""]
      .join(" ")
      .trim() || appt.doctor.email;
    const clinicName = clinicNameMap.get(appt.clinicId) ?? "Tu clinica";
    const dateTime = appt.startAt.toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" });

    try {
      const tpl = await resolveEmailTemplate(appt.clinicId, "APPOINTMENT_REMINDER", {
        patientName,
        doctorName,
        dateTime,
        clinicName,
      });

      if (!tpl.enabled) {
        skipped++;
        continue;
      }

      const result = await sendEmail({
        origin,
        to: patientEmail,
        subject: tpl.subject,
        html: tpl.body,
      });

      if (result.ok) {
        sent++;
      } else {
        errors.push(`${patientEmail}: ${result.error}`);
        skipped++;
      }
    } catch (err) {
      errors.push(`${patientEmail}: ${err instanceof Error ? err.message : "Error desconocido"}`);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    total: appointments.length,
    sent,
    skipped,
    errors,
  });
}
