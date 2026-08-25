import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["SECRETARY"]);
    const clinicId = session.clinicId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [
      clinic,
      todayAppointments,
      todayCompleted,
      todayNoShow,
      todayCancelled,
      todayByStatus,
      todayTreatments,
      recentAppointments,
    ] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, city: true } }),

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

      prisma.appointment.groupBy({
        by: ["status"],
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } },
        _count: { id: true },
      }),

      prisma.patientTreatment.findMany({
        where: {
          patient: { clinicId },
          performedAt: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true,
          performedAt: true,
          treatment: { select: { name: true } },
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { performedAt: "desc" },
        take: 10,
      }),

      prisma.appointment.findMany({
        where: { clinicId, startAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          paymentStatus: true,
          patientId: true,
          doctorId: true,
          // Sala de espera: el estado se deriva de estos tres campos.
          arrivedAt: true,
          delayMinutes: true,
          arrivalNotifiedAt: true,
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { profile: { select: { firstName: true, lastName: true } } } },
          box: { select: { name: true } },
          // Cobro ya registrado, para precargar el modal y no cobrar a ciegas.
          paymentHistory: {
            select: {
              id: true,
              amount: true,
              status: true,
              notes: true,
              recordedAt: true,
              patientTreatment: {
                select: { treatment: { select: { id: true, name: true, price: true } } },
              },
            },
          },
        },
      }),
    ]);

    const todayScheduled = todayAppointments - todayCompleted - todayNoShow - todayCancelled;
    const attendanceRate =
      todayAppointments > 0
        ? Math.round((todayCompleted / (todayCompleted + todayNoShow || 1)) * 100)
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
          todayTreatmentCount: todayTreatments.length,
        },
        appointmentsByStatus: todayByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        todayTreatments: todayTreatments.map((t) => ({
          id: t.id,
          treatmentName: t.treatment.name,
          patientName: `${t.patient.firstName} ${t.patient.lastName}`,
          performedAt: t.performedAt,
        })),
        recentAppointments: recentAppointments.map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt,
          status: a.status,
          paymentStatus: a.paymentStatus,
          patientId: a.patientId,
          doctorId: a.doctorId,
          arrivedAt: a.arrivedAt,
          delayMinutes: a.delayMinutes,
          arrivalNotifiedAt: a.arrivalNotifiedAt,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          doctorName: a.doctor.profile
            ? `${a.doctor.profile.firstName} ${a.doctor.profile.lastName}`
            : "—",
          boxName: a.box.name,
          payment: a.paymentHistory
            ? {
                id: a.paymentHistory.id,
                amount: Number(a.paymentHistory.amount),
                status: a.paymentHistory.status,
                notes: a.paymentHistory.notes,
                recordedAt: a.paymentHistory.recordedAt,
                treatmentId: a.paymentHistory.patientTreatment.treatment.id,
                treatmentName: a.paymentHistory.patientTreatment.treatment.name,
              }
            : null,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
