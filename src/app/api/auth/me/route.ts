import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readMgClinic } from "@/server/clinics/mgClinic";

export const runtime = "nodejs";

/**
 * GET /api/auth/me
 * - Revisa la cookie mg_session
 * - Verifica firma y expiración usando SESSION_SECRET
 * - Responde { ok: true, session: { userId, role, exp }, profile, clinic } si es válida
 */
export async function GET() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "SESSION_SECRET no configurado" },
      { status: 500 }
    );
  }

  const value = cookies().get("mg_session")?.value;
  if (!value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = verifySessionCookieValue(value, secret);
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Enriquecer con nombre del usuario y clínica seleccionada
  let profileName: string | null = null;
  let clinicName: string | null = null;

  try {
    const [profile, clinicCookie] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: payload.userId },
        select: { firstName: true, lastName: true },
      }),
      Promise.resolve(readMgClinic(cookies().get("mg_clinic")?.value)),
    ]);

    if (profile) {
      profileName = `${profile.firstName} ${profile.lastName}`.trim();
    }

    if (clinicCookie && clinicCookie.userId === payload.userId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicCookie.clinicId },
        select: { name: true, city: true },
      });
      if (clinic) {
        clinicName = [clinic.name, clinic.city].filter(Boolean).join(" - ");
      }
    }
  } catch {
    // No bloquear la respuesta si falla el enriquecimiento
  }

  return NextResponse.json({
    ok: true,
    session: payload,
    profileName,
    clinicName,
  });
}
