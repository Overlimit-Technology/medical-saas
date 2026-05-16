import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePassword, hashPassword } from "@/lib/password";
import { normalizeId } from "@/lib/normalize";
import { ClinicsService } from "@/server/clinics/ClinicsService";
import { resolveClinicLabels } from "@/server/clinics/clinicDisplay";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { DoctorsService } from "@/server/doctors/DoctorsService";
import { sendEmail } from "@/server/notifications/email";
import { resolveEmailTemplate } from "@/server/notifications/emailTemplates";
import { normalizePermissions } from "@/lib/permissions";

const userCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "DOCTOR", "SECRETARY"]),
  isSuperAdmin: z.boolean().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  rut: z.string().min(1),
  specialty: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional(),
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
    throw new Error("El RUN ya está registrado.");
  }

  const profiles = await prisma.userProfile.findMany({
    where: { rut: { not: null } },
    select: { rut: true },
  });
  const existsInProfiles = profiles.some(
    (profile) => normalizeId(profile.rut ?? "") === normalized
  );
  if (existsInProfiles) {
    throw new Error("El RUN ya está registrado.");
  }
}

function getUserCreationErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ").toLowerCase()
      : String(error.meta?.target ?? "").toLowerCase();

    if (target.includes("email")) {
      return "Ya existe un usuario con ese correo.";
    }
    if (target.includes("rut")) {
      return "El RUN ya está registrado.";
    }

    return "Ya existe un usuario con esos datos.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo crear el usuario.";
}

async function sendWelcomeEmail(
  origin: string,
  clinicId: string,
  payload: { to: string; name: string; email: string; password: string; clinicLabels: string[] }
) {
  const clinics =
    payload.clinicLabels.length > 1
      ? payload.clinicLabels.join(", ")
      : payload.clinicLabels[0] ?? "Sede no especificada";

  const tpl = await resolveEmailTemplate(clinicId, "USER_WELCOME", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    clinics,
  });

  if (!tpl.enabled) return;

  const sent = await sendEmail({
    origin,
    to: payload.to,
    subject: tpl.subject,
    html: tpl.body,
  });

  if (!sent.ok) {
    throw new Error(sent.error);
  }
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");

    const items = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "DOCTOR", "SECRETARY"] },
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
    requireRole(session, ["ADMIN"], "USERS");

    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Los datos del usuario no son válidos." }, { status: 400 });
    }
    if (parsed.data.isSuperAdmin && parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Solo los usuarios admin pueden ser super admin." },
        { status: 400 }
      );
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
    const permissions = normalizePermissions(parsed.data.permissions);

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
        permissions,
        clinicIds,
      });
    } else {
      const passwordHash = await hashPassword(generatedPassword);
      item = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          mustChangePassword: true,
          role: parsed.data.role,
          isSuperAdmin: parsed.data.role === "ADMIN" && parsed.data.isSuperAdmin === true,
          permissions,
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
      await sendWelcomeEmail(origin, session.clinicId, {
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
    const message = getUserCreationErrorMessage(error);
    const normalizedMessage = message.toLowerCase();
    const status =
      normalizedMessage.includes("registrado") || normalizedMessage.includes("ya existe") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
