import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicSession } from "@/server/auth/requireSession";

export const runtime = "nodejs";

/**
 * GET /api/agenda/banner
 * Devuelve datos para el banner superior de la agenda.
 * - Doctor: su info personal + stats de sus pacientes/citas.
 * - Admin/Secretary: info general de la clínica + stats globales.
 */
export async function GET() {
  try {
    const session = await requireClinicSession();
    const { userId, role, clinicId } = session;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (role === "DOCTOR") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          doctorProfile: true,
        },
      });

      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, city: true },
      });

      const totalPatients = await prisma.patient.count({
        where: {
          clinicId,
          isActive: true,
          appointments: { some: { doctorId: userId } },
        },
      });

      const inTreatment = await prisma.patient.count({
        where: {
          clinicId,
          isActive: true,
          appointments: { some: { doctorId: userId } },
          patientTreatments: { some: {} },
        },
      });

      const todayAppointments = await prisma.appointment.count({
        where: {
          clinicId,
          doctorId: userId,
          startAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      });

      const completedToday = await prisma.appointment.count({
        where: {
          clinicId,
          doctorId: userId,
          startAt: { gte: todayStart, lte: todayEnd },
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          mode: "doctor",
          name: `${user?.profile?.firstName ?? ""} ${user?.profile?.lastName ?? ""}`.trim(),
          specialty: user?.doctorProfile?.specialty ?? "Doctor",
          location: clinic?.city ?? "",
          email: user?.email ?? "",
          phone: user?.profile?.phone ?? "",
          totalPatients,
          inTreatment,
          todayAppointments,
          completedToday,
        },
      });
    }

    // Admin / Secretary: datos generales de la clínica
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, city: true },
    });

    const totalPatients = await prisma.patient.count({
      where: { clinicId, isActive: true },
    });

    const inTreatment = await prisma.patient.count({
      where: {
        clinicId,
        isActive: true,
        patientTreatments: { some: {} },
      },
    });

    const todayAppointments = await prisma.appointment.count({
      where: {
        clinicId,
        startAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    });

    const completedToday = await prisma.appointment.count({
      where: {
        clinicId,
        startAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    });

    const activeDoctors = await prisma.user.count({
      where: {
        role: "DOCTOR",
        status: "ACTIVE",
        doctorProfile: { is: { isActive: true } },
        clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        mode: "clinic",
        name: clinic?.name ?? "Clínica",
        location: clinic?.city ?? "",
        totalPatients,
        inTreatment,
        todayAppointments,
        completedToday,
        activeDoctors,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar la información del banner." },
      { status: 400 }
    );
  }
}
