import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionCookieValue } from "@/lib/session";
import { requireAuthSession } from "@/server/auth/requireSession";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contrasena actual es obligatoria"),
  newPassword: z.string().min(8, "La nueva contrasena debe tener al menos 8 caracteres"),
});

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no esta definido");
  return secret;
}

export async function POST(req: Request) {
  try {
    const session = await requireAuthSession();
    const body = await req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return NextResponse.json(
        { ok: false, error: "La nueva contrasena debe ser distinta." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, error: "Contrasena actual incorrecta." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
    const secret = getSessionSecret();
    const value = createSessionCookieValue(
      { userId: session.userId, role: session.role, exp, mustChangePassword: false },
      secret
    );

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set("mg_session", value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(exp * 1000),
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contrasena.";
    const status = message.includes("No autorizado") ? 401 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
