import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";
import { mapErrorToHttpStatus } from "@/server/fhir/r4/response";

export async function GET() {
  try {
    const session = await requireClinicSession();
    const clinicId = session.clinicId;

    // Run all queries in parallel
    const [clinic, totalBoxes, totalUsers, activeFormTemplates, totalPatients] = await Promise.all([
      // Clinic info
      prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, city: true },
      }),

      // Count active boxes
      prisma.box.count({
        where: { clinicId, isActive: true },
      }),

      // Count active users (doctors and staff)
      prisma.clinicMembership.count({
        where: {
          clinicId,
          status: "ACTIVE",
          user: { status: "ACTIVE" },
        },
      }),

      // Count form templates
      prisma.formTemplate.count({
        where: { clinicId, isActive: true },
      }),

      // Count active patients
      prisma.patient.count({
        where: { clinicId, isActive: true },
      }),
    ]);

    // Get more detailed info about users
    const usersDetail = await prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { status: "ACTIVE" },
      },
      select: {
        user: {
          select: {
            id: true,
            role: true,
            profile: { select: { firstName: true, lastName: true } },
            doctorProfile: { select: { specialty: true } },
          },
        },
      },
    });

    const doctorCount = usersDetail.filter((u) => u.user.role === "DOCTOR").length;
    const staffCount = usersDetail.filter((u) => u.user.role !== "DOCTOR").length;

    // Get unique treatments used in the clinic (through patient treatments)
    const treatmentsInClinic = await prisma.patientTreatment.findMany({
      where: {
        patient: { clinicId },
      },
      distinct: ["treatmentId"],
      select: { treatmentId: true },
    });

    const totalTreatments = treatmentsInClinic.length;

    // Get top treatments by usage in this clinic
    const topTreatmentsRaw = await prisma.patientTreatment.groupBy({
      by: ["treatmentId"],
      where: {
        patient: { clinicId },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Resolve treatment names and prices
    const treatmentIds = topTreatmentsRaw.map((t) => t.treatmentId);
    const treatments = treatmentIds.length
      ? await prisma.treatment.findMany({
          where: { id: { in: treatmentIds } },
          select: { id: true, name: true, price: true },
        })
      : [];
    const treatmentMap = new Map(treatments.map((t) => [t.id, t]));

    const topTreatments = topTreatmentsRaw
      .map((t) => treatmentMap.get(t.treatmentId))
      .filter((t) => t !== undefined);

    return NextResponse.json({
      ok: true,
      data: {
        clinic: clinic ?? { name: "Mi clínica", city: "" },
        canManageUsers: session.isSuperAdmin === true,
        modules: {
          boxes: {
            total: totalBoxes,
            icon: "DoorOpen",
            label: "Boxes",
          },
          treatments: {
            total: totalTreatments,
            icon: "Pill",
            label: "Tratamientos",
          },
          formTemplates: {
            total: activeFormTemplates,
            icon: "ClipboardList",
            label: "Fichas Clínicas",
          },
          users: {
            total: totalUsers,
            doctors: doctorCount,
            staff: staffCount,
            icon: "UserCog",
            label: "Usuarios",
          },
          patients: {
            total: totalPatients,
            icon: "Users",
            label: "Pacientes",
          },
        },
        topTreatments,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la información del dashboard.";
    const status = mapErrorToHttpStatus(message);

    if (status >= 500) {
      console.error("Error fetching clinic dashboard:", error);
    }

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}
