import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/session";

export const runtime = "nodejs";

/**
 * GET /api/auth/me
 * - Revisa la cookie mg_session
 * - Verifica firma y expiración usando SESSION_SECRET
 * - Responde { ok: true, session: { userId, role, exp } } si es válida
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

  return NextResponse.json({ ok: true, session: payload });
}
