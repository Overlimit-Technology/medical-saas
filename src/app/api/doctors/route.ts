import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { resolveClinicLabels } from "@/server/clinics/clinicDisplay";
import { DoctorsService } from "@/server/doctors/DoctorsService";
import { sendEmail } from "@/server/notifications/email";
import { resolveEmailTemplate } from "@/server/notifications/emailTemplates";

const doctorCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  rut: z.string().min(1),
  specialty: z.string().optional().nullable(),
  clinicIds: z.array(z.string()).optional(),
});

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

function getDoctorCreationErrorMessage(error: unknown) {
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

    return "Ya existe un doctor con esos datos.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo crear el doctor.";
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    if (session.role === "DOCTOR") {
      const items = await DoctorsService.listForUser(session.clinicId, session.userId);
      return NextResponse.json({ ok: true, items });
    }
    requireRole(session, ["ADMIN"], "AGENDA");

    const items = await DoctorsService.list(session.clinicId);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los doctores." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], "USERS");

    const body = await req.json();
    const parsed = doctorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Los datos del doctor no son válidos." }, { status: 400 });
    }

    const generatedPassword = generatePassword();

    const clinicIds = parsed.data.clinicIds ?? [session.clinicId];
    const clinicLabels = await resolveClinicLabels(clinicIds);

    const item = await DoctorsService.create({
      email: parsed.data.email,
      password: generatedPassword,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      rut: parsed.data.rut,
      specialty: parsed.data.specialty,
      clinicIds,
    });

    try {
      const origin = new URL(req.url).origin;
      await sendWelcomeEmail(origin, session.clinicId, {
        to: item.email,
        name: parsed.data.firstName,
        email: item.email,
        password: generatedPassword,
        clinicLabels,
      });
    } catch (error) {
      await prisma.user.delete({ where: { id: item.id } }).catch(() => null);
      throw error;
    }

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = getDoctorCreationErrorMessage(error);
    const normalizedMessage = message.toLowerCase();
    const status =
      normalizedMessage.includes("registrado") || normalizedMessage.includes("ya existe") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
