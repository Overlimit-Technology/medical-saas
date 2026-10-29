import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/server/auth/requireSession";

export type SuperAdminActor = { userId: string; email: string };

// Guardia comun de las rutas del super admin:
// 401 sin sesion, 403 si la sesion no es de super admin. Ademas comprueba en la base que la cuenta siga
// siendo super admin y activa (la cookie firmada podria estar desactualizada).
// Uso: const g = await requireSuperAdmin(); if (!g.ok) return g.response;
export async function requireSuperAdmin(): Promise<
  { ok: true; actor: SuperAdminActor } | { ok: false; response: NextResponse }
> {
  let session;
  try {
    session = await requireAuthSession();
  } catch {
    return { ok: false, response: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 }) };
  }
  const deny = () => ({
    ok: false as const,
    response: NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 }),
  });
  if (session.isSuperAdmin !== true || session.mustChangePassword === true) return deny();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, isSuperAdmin: true, status: true },
  });
  if (!user || !user.isSuperAdmin || user.status !== "ACTIVE") return deny();

  return { ok: true, actor: { userId: session.userId, email: user.email } };
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
