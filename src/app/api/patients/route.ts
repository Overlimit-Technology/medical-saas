import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { PatientsService } from "@/server/patients/PatientsService";

const patientCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  secondLastName: z.string().optional().nullable(),
  run: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { clinicId } = await requireClinicSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const data = await PatientsService.list({
      clinicId,
      q,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Failed to load patients" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = patientCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;

    const item = await PatientsService.create({
      clinicId: session.clinicId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      secondLastName: parsed.data.secondLastName,
      run: parsed.data.run,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthDate,
      gender: parsed.data.gender,
      address: parsed.data.address,
      city: parsed.data.city,
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create patient";
    const status = message.includes("exists") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
