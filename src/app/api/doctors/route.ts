import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { DoctorsService } from "@/server/doctors/DoctorsService";

const doctorCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  rut: z.string().min(1),
  specialty: z.string().optional().nullable(),
  clinicIds: z.array(z.string()).optional(),
});

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
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load doctors" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = doctorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await DoctorsService.create({
      email: parsed.data.email,
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      rut: parsed.data.rut,
      specialty: parsed.data.specialty,
      clinicIds: parsed.data.clinicIds ?? [session.clinicId],
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create doctor";
    const status = message.includes("exists") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
