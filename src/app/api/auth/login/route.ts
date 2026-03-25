import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/domain/auth/schemas/login.schema";
import { loginWithEmailPassword } from "@/server/auth/AuthServiceDb";
import { createSessionCookieValue } from "@/lib/session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error("[/api/auth/login] SESSION_SECRET no est? definido");
    throw new Error("SESSION_SECRET no est? definido");
  }
  return secret;
}

/**
 * Endpoint POST para login:
 * 1. Recibe el email y password desde el cliente.
 * 2. Valida el input con Zod.
 * 3. Llama al servicio de autenticación para verificar usuario y password.
 * 4. Si todo es correcto, genera una cookie de sesión httpOnly.
 */
export async function POST(req: Request) {
  try {
    // Parseamos el body de la solicitud
    const body = await req.json();
    console.log("[POST /api/auth/login] Body recibido", {
      email: body?.email,
      hasPassword: typeof body?.password === "string",
    });
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      // Si la validación falla, devolvemos un error 400
      return NextResponse.json(
        {
          message: "Datos inválidos",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Llamamos al servicio de autenticación para verificar las credenciales
    const user = await loginWithEmailPassword(parsed.data);
    console.log("[POST /api/auth/login] Login OK para usuario", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Creamos el valor de la cookie httpOnly
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 horas de expiración
    const secret = getSessionSecret();
    const value = createSessionCookieValue(
      { userId: user.id, role: user.role, exp, mustChangePassword: user.mustChangePassword ?? false },
      secret
    );

    // Establecemos la cookie httpOnly con la sesión
    cookies().set("mg_session", value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(exp * 1000), // Expiración de la cookie
    });

    // Respondemos con el usuario (sin la contraseña) y ok
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("[POST /api/auth/login] Error real:", e);
    const msg = e instanceof Error ? e.message : "No se pudo iniciar sesi?n.";

    // Si las credenciales son inv?lidas, devolvemos un error 401
    const status = msg.includes("Credenciales") ? 401 : 400;

    return NextResponse.json(
      { message: "No se pudo iniciar sesi?n. Revisa tus credenciales." },
      { status }
    );
  }
}
