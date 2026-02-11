import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readMgSession } from "@/server/auth/mgSession";
import { readMgClinic } from "@/server/clinics/mgClinic";
import { ClinicsService } from "@/server/clinics/ClinicsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionCookie = cookies().get("mg_session")?.value;
  const session = await readMgSession(sessionCookie);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const clinicCookie = cookies().get("mg_clinic")?.value;
  let activeClinicId: string | null = null;
  try {
    const activeClinic = await readMgClinic(clinicCookie);
    if (activeClinic && activeClinic.userId === session.userId) {
      activeClinicId = activeClinic.clinicId;
    }
  } catch (error) {
    activeClinicId = null;
  }

  const items = await ClinicsService.listUserActiveClinics(session.userId);
  return NextResponse.json({ ok: true, items, activeClinicId }, { status: 200 });
}
