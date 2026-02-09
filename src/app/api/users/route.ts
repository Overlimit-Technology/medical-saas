import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePassword, hashPassword } from "@/lib/password";
import { normalizeId } from "@/lib/normalize";
import { ClinicsService } from "@/server/clinics/ClinicsService";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { DoctorsService } from "@/server/doctors/DoctorsService";

const userCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["DOCTOR", "SECRETARY"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  rut: z.string().min(1),
  specialty: z.string().optional().nullable(),
  clinicId: z.string().optional(),
});

async function ensureRutAvailable(rut: string) {
  const normalized = normalizeId(rut);

  const existingDoctor = await prisma.doctorProfile.findFirst({
    where: { rutNormalized: normalized },
    select: { id: true },
  });
  if (existingDoctor) {
    throw new Error("RUN already exists");
  }

  const profiles = await prisma.userProfile.findMany({
    where: { rut: { not: null } },
    select: { rut: true },
  });
  const existsInProfiles = profiles.some(
    (profile) => normalizeId(profile.rut ?? "") === normalized
  );
  if (existsInProfiles) {
    throw new Error("RUN already exists");
  }
}

async function sendWelcomeEmail(
  origin: string,
  payload: { to: string; name: string; email: string; password: string }
) {
  const subject = "Tu cuenta ha sido creada";
  const text = [
    `Hola ${payload.name},`,
    "",
    "Tu cuenta fue creada por el administrador.",
    `Usuario: ${payload.email}`,
    `Contrasena temporal: ${payload.password}`,
    "",
    "Por seguridad, cambia tu contrasena al iniciar sesion.",
  ].join("\n");

  const res = await fetch(new URL("/api/email/send", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: payload.to, subject, text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = data?.error ?? data?.message ?? "No se pudo enviar el correo.";
    throw new Error(detail);
  }
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const items = await prisma.user.findMany({
      where: {
        role: { in: ["DOCTOR", "SECRETARY"] },
        clinicMemberships: {
          some: { clinicId: session.clinicId, status: "ACTIVE" },
        },
      },
      include: {
        profile: true,
        doctorProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load users" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const clinicId = parsed.data.clinicId ?? session.clinicId;
    await ClinicsService.selectActiveClinic(session.userId, clinicId);
    await ensureRutAvailable(parsed.data.rut);

    const generatedPassword = generatePassword();
    let item: { id: string; email: string };

    if (parsed.data.role === "DOCTOR") {
      item = await DoctorsService.create({
        email: parsed.data.email,
        password: generatedPassword,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: null,
        rut: parsed.data.rut,
        specialty: parsed.data.specialty ?? null,
        clinicIds: [clinicId],
      });
    } else {
      const passwordHash = await hashPassword(generatedPassword);
      item = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          role: "SECRETARY",
          status: "ACTIVE",
          profile: {
            create: {
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              phone: null,
              rut: parsed.data.rut,
            },
          },
          clinicMemberships: {
            create: [{ clinicId, status: "ACTIVE" }],
          },
        },
        select: { id: true, email: true },
      });
    }

    try {
      const origin = new URL(req.url).origin;
      await sendWelcomeEmail(origin, {
        to: parsed.data.email,
        name: parsed.data.firstName,
        email: parsed.data.email,
        password: generatedPassword,
      });
    } catch (error) {
      await prisma.user.delete({ where: { id: item.id } }).catch(() => null);
      throw error;
    }

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    const status = message.includes("exists") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
