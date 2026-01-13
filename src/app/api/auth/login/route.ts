import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/domain/auth/schemas/login.schema";
import { loginWithEmailPassword } from "@/server/auth/AuthServiceDb";
import { createSessionCookieValue } from "@/lib/session";

/**
 * Variables requeridas:
 * - SESSION_SECRET: firma de la cookie (ponla en .env.local)
 *
 * Ejemplo:
 * SESSION_SECRET="cambia-esto-por-un-secreto-largo"
 */
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido");
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

    // Creamos el valor de la cookie httpOnly
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 horas de expiración
    const secret = getSessionSecret();
    const value = createSessionCookieValue(
      { userId: user.id, role: user.role, exp },
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
    const msg =
      e instanceof Error ? e.message : "No se pudo iniciar sesión.";

    // Si las credenciales son inválidas, devolvemos un error 401
    const status = msg.includes("Credenciales") ? 401 : 400;

    return NextResponse.json(
      { message: "No se pudo iniciar sesión. Revisa tus credenciales." },
      { status }
    );
  }
}
