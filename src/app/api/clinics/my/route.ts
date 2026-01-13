import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readMgSession } from "@/server/auth/mgSession";
import { ClinicsService } from "@/server/clinics/ClinicsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionCookie = cookies().get("mg_session")?.value;
  const session = await readMgSession(sessionCookie);

  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const items = await ClinicsService.listUserActiveClinics(session.userId);
  return NextResponse.json({ ok: true, items }, { status: 200 });
}
