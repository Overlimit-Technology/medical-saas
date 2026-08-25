import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
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
