import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);
    const clinicId = session.clinicId;
    const doctorId = session.userId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    const [
      clinic,
      doctorProfile,
      todayAppointments,
      todayCompleted,
      todayNoShow,
      todayCancelled,
      monthAppointments,
      prevMonthAppointments,
      totalPatients,
      monthTreatmentStats,
      todayAppointmentsList,
      monthPayments,
      prevMonthPayments,
      appointmentsByStatus,
    ] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, city: true } }),

      prisma.user.findUnique({
        where: { id: doctorId },
        select: {
          profile: { select: { firstName: true, lastName: true } },
          doctorProfile: { select: { specialty: true } },
        },
      }),

      // Today's appointments for this doctor
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: todayStart, lt: todayEnd }, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: todayStart, lt: todayEnd }, status: "NO_SHOW" },
      }),
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: todayStart, lt: todayEnd }, status: "CANCELLED" },
      }),

      // Month appointments for this doctor
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: monthStart, lt: todayEnd } },
      }),
      prisma.appointment.count({
        where: { clinicId, doctorId, startAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),

      // Unique patients this doctor has seen (all time, this clinic)
      prisma.appointment.findMany({
        where: { clinicId, doctorId },
        select: { patientId: true },
        distinct: ["patientId"],
      }),

      // Top treatments this month (linked through appointments of this doctor's patients)
      prisma.patientTreatment.groupBy({
        by: ["treatmentId"],
        where: {
          performedAt: { gte: monthStart },
          patient: {
            clinicId,
            appointments: { some: { doctorId } },
          },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Today's appointments list
      prisma.appointment.findMany({
        where: { clinicId, doctorId, startAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          paymentStatus: true,
          patient: { select: { firstName: true, lastName: true } },
          box: { select: { name: true } },
        },
      }),

      // Revenue this month (from patients of this doctor)
      prisma.paymentHistory.aggregate({
        where: {
          status: "PAID",
          recordedAt: { gte: monthStart },
          patientTreatment: {
            patient: {
              clinicId,
              appointments: { some: { doctorId } },
            },
          },
        },
        _sum: { amount: true },
      }),

      // Revenue previous month
      prisma.paymentHistory.aggregate({
        where: {
          status: "PAID",
          recordedAt: { gte: prevMonthStart, lt: prevMonthEnd },
          patientTreatment: {
            patient: {
              clinicId,
              appointments: { some: { doctorId } },
            },
          },
        },
        _sum: { amount: true },
      }),

      // Appointment status distribution this month
      prisma.appointment.groupBy({
        by: ["status"],
        where: { clinicId, doctorId, startAt: { gte: monthStart } },
        _count: { id: true },
      }),
    ]);

    // Resolve treatment names
    const treatmentIds = monthTreatmentStats.map((t) => t.treatmentId);
    const treatments = treatmentIds.length
      ? await prisma.treatment.findMany({
          where: { id: { in: treatmentIds } },
          select: { id: true, name: true, price: true },
        })
      : [];
    const treatmentMap = new Map(treatments.map((t) => [t.id, t]));

    const revenue = Number(monthPayments._sum.amount ?? 0);
    const prevRevenue = Number(prevMonthPayments._sum.amount ?? 0);

    function delta(current: number, previous: number): string {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const pct = ((current - previous) / previous) * 100;
      return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    }

    const todayScheduled = todayAppointments - todayCompleted - todayNoShow - todayCancelled;
    const attendanceRate =
      todayAppointments > 0
        ? Math.round((todayCompleted / (todayCompleted + todayNoShow || 1)) * 100)
        : 0;

    const doctorName = doctorProfile?.profile
      ? `${doctorProfile.profile.firstName} ${doctorProfile.profile.lastName}`
      : "Doctor";

    return NextResponse.json({
      ok: true,
      data: {
        clinic: clinic ?? { name: "Sede", city: "" },
        doctorName,
        specialty: doctorProfile?.doctorProfile?.specialty ?? "",
        kpis: {
          todayAppointments,
          todayScheduled,
          todayCompleted,
          todayNoShow,
          todayCancelled,
          attendanceRate,
          monthAppointments,
          monthAppointmentsDelta: delta(monthAppointments, prevMonthAppointments),
          totalPatients: totalPatients.length,
          revenue,
          revenueDelta: delta(revenue, prevRevenue),
        },
        topTreatments: monthTreatmentStats.map((t) => {
          const tr = treatmentMap.get(t.treatmentId);
          return {
            name: tr?.name ?? "Desconocido",
            count: t._count.id,
            price: Number(tr?.price ?? 0),
          };
        }),
        appointmentsByStatus: appointmentsByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        todaySchedule: todayAppointmentsList.map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt,
          status: a.status,
          paymentStatus: a.paymentStatus,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          boxName: a.box.name,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
