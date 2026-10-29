import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readMgSession } from "@/server/auth/mgSession";
import { clearDevice, loadUser, readDevice, writeDevice } from "@/server/auth/sharedDevice";
import { AuditService } from "@/server/audit/AuditService";

export async function POST(req: Request) {
  // Equipo compartido: "Cerrar mi sesion" solo retira MI perfil; scope=all cierra todas.
  try {
    const device = await readDevice();
    if (device) {
      const session = await readMgSession(cookies().get("mg_session")?.value);
      const closeAll =
        new URL(req.url).searchParams.get("scope") === "all" ||
        (await req.clone().formData().catch(() => null))?.get("scope") === "all";
      const remaining = closeAll || !session ? [] : device.p.filter((p) => p.u !== session.userId);
      if (closeAll || session) {
        // Sin sesion (pantalla de bloqueo) no se toca la lista: solo "Cerrar todas" la vacia.
        if (closeAll || remaining.length < device.p.length) {
          if (remaining.length > 0) await writeDevice(device.clinicId, remaining);
          else clearDevice();
        }
        const user = session ? await loadUser({ id: session.userId }) : null;
        await AuditService.log(
          closeAll ? "SESION_COMPARTIDA_CIERRE_TOTAL" : "SESION_COMPARTIDA_CIERRE",
          user?.email ?? "pantalla-bloqueo",
          closeAll ? "Se cerraron todas las sesiones del equipo." : "Cierre de la sesion propia."
        );
      }
    }
  } catch (error) {
    console.error("[POST /api/auth/logout] equipo compartido:", error);
  }

  // Clear auth session cookie
  cookies().set("mg_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  // Clear clinic context cookie
  cookies().set("mg_clinic", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  // Redirect back to home (use current request origin, not hardcoded localhost).
  // 303 See Other: obliga al navegador a seguir el redirect con GET. El 307 por
  // defecto conserva el metodo y reenvia POST a "/", que devuelve 405.
  const url = new URL("/", req.url);
  return NextResponse.redirect(url, 303);
}
