import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Signed cookie format:
 *   "<payloadB64>.<sigB64>"
 * sig = HMAC-SHA256(payloadB64, SESSION_SECRET)
 * payload includes: exp (epoch seconds)
 *
 * Runs on Edge runtime => WebCrypto (crypto.subtle).
 */

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

  // clinic context (mg_clinic)
  clinicId?: unknown;
  setAt?: unknown;
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

function isValidSessionPayload(p: SignedPayload | null): p is { userId: string; exp: number; role?: unknown } {
  return !!p && typeof p.userId === "string" && typeof p.exp === "number";
}

function isValidClinicPayload(
  p: SignedPayload | null,
  expectedUserId: string
): p is { userId: string; clinicId: string; exp: number; setAt?: unknown } {
  return (
    !!p &&
    typeof p.userId === "string" &&
    p.userId === expectedUserId &&
    typeof p.clinicId === "string" &&
    p.clinicId.length > 0 &&
    typeof p.exp === "number"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.next();

  const sessionCookie = req.cookies.get("mg_session")?.value;
  const sessionPayload = await readSignedCookiePayload(sessionCookie, secret);
  const hasValidSession = isValidSessionPayload(sessionPayload);

  // Read clinic context (mg_clinic) only if session exists
  const clinicCookie = req.cookies.get("mg_clinic")?.value;
  const clinicPayload = hasValidSession
    ? await readSignedCookiePayload(clinicCookie, secret)
    : null;

  const hasValidClinic = hasValidSession
    ? isValidClinicPayload(clinicPayload, sessionPayload.userId)
    : false;

  // 1) Logged-in users should not see login pages
  if (pathname === "/" || pathname === "/login") {
    if (hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = hasValidClinic ? "/dashboard" : "/select-clinic";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) Clinic selector requires session
  if (pathname === "/select-clinic") {
    if (!hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (hasValidClinic) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 3) Dashboard requires session + selected clinic
  if (pathname.startsWith("/dashboard")) {
    if (!hasValidSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (!hasValidClinic) {
      const url = req.nextUrl.clone();
      url.pathname = "/select-clinic";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/select-clinic", "/dashboard/:path*"],
};
