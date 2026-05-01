import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasPermission, type UserPermission } from "@/lib/permissions";

function base64urlToUint8Array(b64url: string) {
  const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const str = atob(b64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function uint8ToBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSha256Base64Url(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return uint8ToBase64Url(new Uint8Array(sig));
}

type SignedPayload = {
  exp?: unknown;
  userId?: unknown;
  role?: unknown;
  isSuperAdmin?: unknown;
  permissions?: unknown;
  usesNewPlatform?: unknown;
  clinicId?: unknown;
  setAt?: unknown;
  mustChangePassword?: unknown;
};

async function readSignedCookiePayload(
  value: string | undefined,
  secret: string
): Promise<SignedPayload | null> {
  if (!value) return null;

  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = await hmacSha256Base64Url(payloadB64, secret);
  if (expected !== sig) return null;

  const payloadBytes = base64urlToUint8Array(payloadB64);
  const payloadJson = new TextDecoder().decode(payloadBytes);

  let payload: SignedPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) return null;

  return payload;
}

function isValidSessionPayload(
  payload: SignedPayload | null
): payload is { userId: string; exp: number; role?: unknown; mustChangePassword?: unknown } {
  return !!payload && typeof payload.userId === "string" && typeof payload.exp === "number";
}

function isValidClinicPayload(
  payload: SignedPayload | null,
  expectedUserId: string
): payload is { userId: string; clinicId: string; exp: number; setAt?: unknown } {
  return (
    !!payload &&
    typeof payload.userId === "string" &&
    payload.userId === expectedUserId &&
    typeof payload.clinicId === "string" &&
    payload.clinicId.length > 0 &&
    typeof payload.exp === "number"
  );
}

const PROTECTED_PREFIXES = [
  "/super-admin",
  "/dashboard",
  "/agenda",
  "/chat",
  "/chat-meta",
  "/formulario-chat",
  "/crm",
  "/leads",
  "/profile",
  "/notifications",
  "/patients",
  "/usuarios",
  "/gestion-usuarios",
  "/doctors",
  "/treatments",
  "/boxes",
  "/appointments",
  "/clinical-visits",
  "/form-templates",
];

function getPermissions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function canAccess(
  role: unknown,
  isSuperAdmin: boolean,
  permissions: readonly string[],
  roles: string[],
  permission: UserPermission
) {
  return (
    typeof role === "string" &&
    ((role === "ADMIN" && isSuperAdmin && roles.includes(role)) ||
      hasPermission(role, permissions, permission, isSuperAdmin))
  );
}

function roleHomePath(role: unknown, isSuperAdmin: boolean) {
  switch (role) {
    case "ADMIN":
      return isSuperAdmin ? "/super-admin" : "/dashboard/admin";
    case "SECRETARY":
      return "/dashboard/secretary";
    default:
      return "/dashboard";
  }
}

function resolveLegacySoftwarePath() {
  const legacyUrl = process.env.LEGACY_SOFTWARE_URL?.trim();
  return legacyUrl && legacyUrl.length > 0 ? legacyUrl : "/legacy-access";
}

function shouldRedirectToLegacy(payload: SignedPayload | null) {
  return !!payload && payload.isSuperAdmin !== true && payload.usesNewPlatform === false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.next();

  const sessionCookie = req.cookies.get("mg_session")?.value;
  const sessionPayload = await readSignedCookiePayload(sessionCookie, secret);
  const hasValidSession = isValidSessionPayload(sessionPayload);

  const clinicCookie = req.cookies.get("mg_clinic")?.value;
  const clinicPayload = hasValidSession
    ? await readSignedCookiePayload(clinicCookie, secret)
    : null;

  const hasValidClinic = hasValidSession
    ? isValidClinicPayload(clinicPayload, sessionPayload.userId)
    : false;

  const isSuperAdmin = sessionPayload?.isSuperAdmin === true;
  const roleHome = roleHomePath(sessionPayload?.role, isSuperAdmin);
  const permissions = getPermissions(sessionPayload?.permissions);
  const mustChangePassword = hasValidSession && sessionPayload?.mustChangePassword === true;
  const shouldUseLegacy = hasValidSession && shouldRedirectToLegacy(sessionPayload);

  if (shouldUseLegacy && pathname !== "/legacy-access") {
    const legacyPath = resolveLegacySoftwarePath();
    if (/^https?:\/\//.test(legacyPath)) {
      return NextResponse.redirect(legacyPath);
    }
    const url = req.nextUrl.clone();
    url.pathname = legacyPath;
    return NextResponse.redirect(url);
  }

  if (pathname === "/" || pathname === "/login") {
    if (hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname =
        mustChangePassword
          ? "/change-password"
          : hasValidClinic || isSuperAdmin
            ? roleHome
            : "/select-clinic";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/change-password") {
    if (!hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (!mustChangePassword) {
      const url = req.nextUrl.clone();
      url.pathname = hasValidClinic || isSuperAdmin ? roleHome : "/select-clinic";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/select-clinic") {
    if (!hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (mustChangePassword) {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
    if (isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }
    if (hasValidClinic) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (mustChangePassword) {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
    if (!hasValidClinic && !isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/select-clinic";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/gestion-usuarios") && !isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (isSuperAdmin && pathname.startsWith("/gestion-usuarios")) {
      const url = req.nextUrl.clone();
      url.pathname = "/super-admin/usuarios";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      if (roleHome !== "/dashboard") {
        const url = req.nextUrl.clone();
        url.pathname = roleHome;
        return NextResponse.redirect(url);
      }
    }

    if (isSuperAdmin && pathname.startsWith("/dashboard/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard/admin") && sessionPayload?.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard/secretary") && sessionPayload?.role !== "SECRETARY") {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/boxes") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "BOXES")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    const canAccessCrmOption = canAccess(
      sessionPayload?.role,
      isSuperAdmin,
      permissions,
      ["ADMIN"],
      "LEADS"
    );
    const canAccessPatients = canAccess(
      sessionPayload?.role,
      isSuperAdmin,
      permissions,
      ["ADMIN"],
      "PATIENTS"
    );
    const canAccessUsers = canAccess(
      sessionPayload?.role,
      isSuperAdmin,
      permissions,
      ["ADMIN"],
      "USERS"
    );

    if (pathname.startsWith("/crm") && !canAccessCrmOption) {
      const url = req.nextUrl.clone();
      url.pathname = sessionPayload?.role === "DOCTOR" ? "/agenda" : roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/leads") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "LEADS")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = sessionPayload?.role === "DOCTOR" ? "/agenda" : roleHome;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/patients") && !canAccessPatients) {
      const url = req.nextUrl.clone();
      url.pathname = sessionPayload?.role === "DOCTOR" ? "/agenda" : roleHome;
      return NextResponse.redirect(url);
    }

    if ((pathname.startsWith("/usuarios") || pathname.startsWith("/doctors")) && !canAccessUsers) {
      const url = req.nextUrl.clone();
      url.pathname = sessionPayload?.role === "DOCTOR" ? "/agenda" : roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/agenda") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "AGENDA")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/chat") &&
      !pathname.startsWith("/chat-meta") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "CHAT")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/chat-meta") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "CHAT_META")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/formulario-chat") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "CHAT_META")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/treatments") &&
      !canAccess(sessionPayload?.role, isSuperAdmin, permissions, ["ADMIN"], "TREATMENTS")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/clinical-visits") &&
      !(sessionPayload?.role === "DOCTOR" &&
        hasPermission(sessionPayload?.role, permissions, "CLINICAL_VISITS", isSuperAdmin))
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/form-templates") &&
      sessionPayload?.role !== "ADMIN" &&
      sessionPayload?.role !== "DOCTOR"
    ) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/change-password",
    "/select-clinic",
    "/super-admin/:path*",
    "/dashboard/:path*",
    "/agenda/:path*",
    "/chat/:path*",
    "/chat-meta/:path*",
    "/formulario-chat/:path*",
    "/crm/:path*",
    "/leads/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/patients/:path*",
    "/usuarios/:path*",
    "/doctors/:path*",
    "/treatments/:path*",
    "/boxes/:path*",
    "/appointments/:path*",
    "/clinical-visits/:path*",
    "/form-templates/:path*",
  ],
};
