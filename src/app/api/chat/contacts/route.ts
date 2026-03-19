import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";
const ONLINE_WINDOW_MINUTES = 10;

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR", "SECRETARY"]);

    const clinic = await prisma.clinic.findFirst({
      where: { id: session.clinicId, isActive: true },
      select: { id: true, name: true, city: true },
    });

    const contacts = await prisma.user.findMany({
      where: {
        id: { not: session.userId },
        status: "ACTIVE",
        role: { in: ["ADMIN", "DOCTOR", "SECRETARY"] },
        clinicMemberships: {
          some: {
            clinicId: session.clinicId,
            status: "ACTIVE",
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        image: true,
        lastLoginAt: true,
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
      orderBy: [{ email: "asc" }],
    });

    const onlineThreshold = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);

    return NextResponse.json({
      ok: true,
      clinic,
      items: contacts.map((contact) => ({
        id: contact.id,
        email: contact.email,
        role: contact.role,
        image: contact.image,
        firstName: contact.profile?.firstName ?? "",
        lastName: contact.profile?.lastName ?? "",
        specialty: contact.doctorProfile?.specialty ?? null,
        isOnline:
          contact.lastLoginAt instanceof Date && contact.lastLoginAt >= onlineThreshold,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los contactos.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
