import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);
    if (!session.isSuperAdmin) {
      throw new Error("Acceso denegado.");
    }
    const clinicId = session.clinicId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    // Run all queries in parallel
    const [
      clinic,
      todayAppointments,
      todayCompleted,
      todayNoShow,
      todayCancelled,
      monthAppointments,
      prevMonthAppointments,
      newPatientsMonth,
      newPatientsPrevMonth,
      totalPatients,
      totalDoctors,
      totalBoxes,
      doctorStats,
      treatmentStats,
      recentAppointments,
      monthPayments,
      prevMonthPayments,
      appointmentsByStatus,
    ] = await Promise.all([
      // Clinic info
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, city: true } }),

      // Today's appointments
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd }, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd }, status: "NO_SHOW" },
      }),
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd }, status: "CANCELLED" },
      }),

      // Month appointments
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: monthStart, lt: todayEnd } },
      }),
      prisma.appointment.count({
        where: { clinicId, startAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),

      // New patients this month
      prisma.patient.count({
        where: { clinicId, createdAt: { gte: monthStart } },
      }),
      prisma.patient.count({
        where: { clinicId, createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),

      // Totals
      prisma.patient.count({ where: { clinicId, isActive: true } }),
      prisma.clinicMembership.count({
        where: {
          clinicId,
          status: "ACTIVE",
          user: { role: "DOCTOR", status: "ACTIVE" },
        },
      }),
      prisma.box.count({ where: { clinicId, isActive: true } }),

      // Top doctors by appointment count this month
      prisma.appointment.groupBy({
        by: ["doctorId"],
        where: { clinicId, startAt: { gte: monthStart } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Top treatments this month
      prisma.patientTreatment.groupBy({
        by: ["treatmentId"],
        where: {
          patient: { clinicId },
          performedAt: { gte: monthStart },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Recent appointments (today's activity)
      prisma.appointment.findMany({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { startAt: "asc" },
        take: 8,
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          paymentStatus: true,
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { profile: { select: { firstName: true, lastName: true } } } },
          box: { select: { name: true } },
        },
      }),

      // Revenue this month (PAID payments)
      prisma.paymentHistory.aggregate({
        where: {
          status: "PAID",
          recordedAt: { gte: monthStart },
          patientTreatment: { patient: { clinicId } },
        },
        _sum: { amount: true },
      }),

      // Revenue previous month
      prisma.paymentHistory.aggregate({
        where: {
          status: "PAID",
          recordedAt: { gte: prevMonthStart, lt: prevMonthEnd },
          patientTreatment: { patient: { clinicId } },
        },
        _sum: { amount: true },
      }),

      // Appointment status distribution this month
      prisma.appointment.groupBy({
        by: ["status"],
        where: { clinicId, startAt: { gte: monthStart } },
        _count: { id: true },
      }),
    ]);

    // Resolve doctor names for top doctors
    const doctorIds = doctorStats.map((d) => d.doctorId);
    const doctorProfiles = doctorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
            doctorProfile: { select: { specialty: true } },
          },
        })
      : [];
    const doctorMap = new Map(doctorProfiles.map((d) => [d.id, d]));

    // Resolve treatment names
    const treatmentIds = treatmentStats.map((t) => t.treatmentId);
    const treatments = treatmentIds.length
      ? await prisma.treatment.findMany({
          where: { id: { in: treatmentIds } },
          select: { id: true, name: true, price: true },
        })
      : [];
    const treatmentMap = new Map(treatments.map((t) => [t.id, t]));

    // Build response
    const revenue = Number(monthPayments._sum.amount ?? 0);
    const prevRevenue = Number(prevMonthPayments._sum.amount ?? 0);

    const delta = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const pct = ((current - previous) / previous) * 100;
      return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    };

    const todayScheduled = todayAppointments - todayCompleted - todayNoShow - todayCancelled;
    const attendanceRate =
      todayAppointments > 0
        ? Math.round(((todayCompleted / (todayCompleted + todayNoShow || 1)) * 100))
        : 0;

    return NextResponse.json({
      ok: true,
      data: {
        clinic: clinic ?? { name: "Sede", city: "" },
        kpis: {
          todayAppointments,
          todayScheduled,
          todayCompleted,
          todayNoShow,
          todayCancelled,
          attendanceRate,
          monthAppointments,
          monthAppointmentsDelta: delta(monthAppointments, prevMonthAppointments),
          newPatientsMonth,
          newPatientsDelta: delta(newPatientsMonth, newPatientsPrevMonth),
          totalPatients,
          totalDoctors,
          totalBoxes,
          revenue,
          revenueDelta: delta(revenue, prevRevenue),
        },
        topDoctors: doctorStats.map((d) => {
          const doc = doctorMap.get(d.doctorId);
          return {
            name: doc?.profile
              ? `${doc.profile.firstName} ${doc.profile.lastName}`
              : "Sin nombre",
            specialty: doc?.doctorProfile?.specialty ?? "",
            count: d._count.id,
          };
        }),
        topTreatments: treatmentStats.map((t) => {
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
        recentAppointments: recentAppointments.map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt,
          status: a.status,
          paymentStatus: a.paymentStatus,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          doctorName: a.doctor.profile
            ? `${a.doctor.profile.firstName} ${a.doctor.profile.lastName}`
            : "—",
          boxName: a.box.name,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
