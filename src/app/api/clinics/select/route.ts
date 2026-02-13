import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readMgSession } from "@/server/auth/mgSession";
import { ClinicsService } from "@/server/clinics/ClinicsService";
import { createMgClinicToken } from "@/server/clinics/mgClinic";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sessionCookie = cookies().get("mg_session")?.value;
  const session = await readMgSession(sessionCookie);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.mustChangePassword) {
    return NextResponse.json({ ok: false, error: "Debes cambiar tu contrasena." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { clinicId?: unknown } | null;
  const clinicId = typeof body?.clinicId === "string" ? body.clinicId : null;

  if (!clinicId) {
    return NextResponse.json({ ok: false, error: "Invalid clinicId" }, { status: 400 });
  }

  await ClinicsService.selectActiveClinic(session.userId, clinicId);

  const now = Math.floor(Date.now() / 1000);
  const token = await createMgClinicToken({
    userId: session.userId,
    clinicId,
    setAt: now,
    exp: session.exp, // aligned to mg_session
  });

  const roleHome =
    session.role === "ADMIN"
      ? "/dashboard/admin"
      : session.role === "SECRETARY"
        ? "/dashboard/secretary"
        : "/dashboard";

  const res = NextResponse.json({ ok: true, redirectTo: roleHome }, { status: 200 });

  res.cookies.set("mg_clinic", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.exp * 1000),
  });

  return res;
}
