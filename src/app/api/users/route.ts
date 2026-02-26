import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePassword, hashPassword } from "@/lib/password";
import { normalizeId } from "@/lib/normalize";
import { ClinicsService } from "@/server/clinics/ClinicsService";
import { resolveClinicLabels } from "@/server/clinics/clinicDisplay";
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
  clinicIds: z.array(z.string().min(1)).optional(),
});

async function ensureRutAvailable(rut: string) {
  const normalized = normalizeId(rut);

  const existingDoctor = await prisma.doctorProfile.findFirst({
    where: { rutNormalized: normalized },
    select: { id: true },
  });
  if (existingDoctor) {
    throw new Error("El RUN ya esta registrado.");
  }

  const profiles = await prisma.userProfile.findMany({
    where: { rut: { not: null } },
    select: { rut: true },
  });
  const existsInProfiles = profiles.some(
    (profile) => normalizeId(profile.rut ?? "") === normalized
  );
  if (existsInProfiles) {
    throw new Error("El RUN ya esta registrado.");
  }
}

async function sendWelcomeEmail(
  origin: string,
  payload: { to: string; name: string; email: string; password: string; clinicLabels: string[] }
) {
  const clinicLine =
    payload.clinicLabels.length > 1
      ? `Sedes asignadas: ${payload.clinicLabels.join(", ")}`
      : `Sede: ${payload.clinicLabels[0] ?? "Sede no especificada"}`;
  const subject = "Bienvenido a ZENSYA - tu cuenta fue creada";
  const text = [
    `Hola ${payload.name},`,
    "",
    "Te damos la bienvenida a ZENSYA.",
    "Tu cuenta fue creada por el administrador.",
    clinicLine,
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
        status: "ACTIVE",
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
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los usuarios." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const selectedClinics = parsed.data.clinicIds?.length
      ? parsed.data.clinicIds
      : parsed.data.clinicId
        ? [parsed.data.clinicId]
        : [session.clinicId];
    const clinicIds = Array.from(new Set(selectedClinics));
    await Promise.all(
      clinicIds.map((clinicId) => ClinicsService.selectActiveClinic(session.userId, clinicId))
    );
    const clinicLabels = await resolveClinicLabels(clinicIds);
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
        clinicIds,
      });
    } else {
      const passwordHash = await hashPassword(generatedPassword);
      item = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          mustChangePassword: true,
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
            create: clinicIds.map((clinicId) => ({ clinicId, status: "ACTIVE" })),
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
        clinicLabels,
      });
    } catch (error) {
      await prisma.user.delete({ where: { id: item.id } }).catch(() => null);
      throw error;
    }

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    const status = message.toLowerCase().includes("registrado") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
