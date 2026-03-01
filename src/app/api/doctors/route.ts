import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { resolveClinicLabels } from "@/server/clinics/clinicDisplay";
import { DoctorsService } from "@/server/doctors/DoctorsService";

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
    body: JSON.stringify({
      to: payload.to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = data?.error ?? data?.message ?? "No se pudo enviar el correo de bienvenida.";
    throw new Error(detail);
  }
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    if (session.role === "DOCTOR") {
      const items = await DoctorsService.listForUser(session.clinicId, session.userId);
      return NextResponse.json({ ok: true, items });
    }
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const items = await DoctorsService.list(session.clinicId);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudieron cargar los doctores." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = doctorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
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
      await sendWelcomeEmail(origin, {
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
    const message = error instanceof Error ? error.message : "No se pudo crear el doctor.";
    const status = message.toLowerCase().includes("registrado") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
