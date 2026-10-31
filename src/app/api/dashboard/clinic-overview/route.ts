import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const fullName = (p?: { firstName: string; lastName: string } | null) =>
  p ? `${p.firstName} ${p.lastName}`.trim() : "";

/**
 * Vista general del admin de la sede (mismo contenido que la demo de zensya.cl):
 * citas de hoy, pacientes, leads nuevos, ingresos del mes, citas de la semana,
 * estado de las citas, agenda de hoy y ocupacion por profesional.
 */
export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    const clinicId = session.clinicId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + DAY);
    // Lunes de esta semana (domingo cuenta como fin de la semana anterior).
    const weekStart = new Date(todayStart.getTime() - ((todayStart.getDay() + 6) % 7) * DAY);
    const weekEnd = new Date(weekStart.getTime() + 6 * DAY);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [clinic, today, week, patients, firstColumn, monthPaid, doctors] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, city: true } }),
      prisma.appointment.findMany({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          doctorId: true,
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { profile: { select: { firstName: true, lastName: true } } } },
          box: { select: { name: true } },
          treatmentPlan: { select: { name: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { clinicId, startAt: { gte: weekStart, lt: weekEnd } },
        select: { startAt: true, status: true },
      }),
      prisma.patient.count({ where: { clinicId, isActive: true } }),
      prisma.leadColumn.findFirst({ where: { clinicId }, orderBy: { position: "asc" }, select: { id: true } }),
      prisma.paymentHistory.aggregate({
        where: { status: "PAID", recordedAt: { gte: monthStart }, patientTreatment: { patient: { clinicId } } },
        _sum: { amount: true },
      }),
      prisma.clinicMembership.findMany({
        where: { clinicId, status: "ACTIVE", user: { status: "ACTIVE", role: "DOCTOR" } },
        select: { user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } } },
      }),
    ]);

    const newLeads = firstColumn
      ? await prisma.crmLead.count({
          where: { clinicId, columnId: firstColumn.id, archived: false, converted: false },
        })
      : 0;

    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((label, i) => {
      const start = weekStart.getTime() + i * DAY;
      return {
        label,
        isToday: start === todayStart.getTime(),
        count: week.filter(
          (a) => a.status !== "CANCELLED" && a.startAt.getTime() >= start && a.startAt.getTime() < start + DAY
        ).length,
      };
    });

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, week.filter((a) => a.status === s).length]));

    const occupancy = doctors
      .map(({ user }) => ({
        doctorId: user.id,
        name: fullName(user.profile) || "Profesional",
        count: today.filter((a) => a.doctorId === user.id && a.status !== "CANCELLED").length,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      ok: true,
      data: {
        clinic: { name: clinic?.name ?? "", city: clinic?.city ?? "" },
        stats: {
          today: today.filter((a) => a.status !== "CANCELLED").length,
          todayConfirmed: today.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED").length,
          patients,
          newLeads,
          monthRevenue: Number(monthPaid._sum.amount ?? 0),
        },
        weekDays,
        byStatus,
        agenda: today.map((a) => ({
          id: a.id,
          startAt: a.startAt.toISOString(),
          endAt: a.endAt.toISOString(),
          status: a.status,
          patient: fullName(a.patient),
          doctor: fullName(a.doctor.profile),
          box: a.box.name,
          reason: a.treatmentPlan?.name ?? null,
        })),
        occupancy,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la vista general.";
    const status = mapErrorToHttpStatus(message);
    if (status >= 500) console.error("Error fetching clinic overview:", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
