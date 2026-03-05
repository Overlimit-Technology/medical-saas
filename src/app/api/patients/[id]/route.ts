import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { PatientsService } from "@/server/patients/PatientsService";

const patientUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  secondLastName: z.string().optional().nullable(),
  run: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { clinicId } = await requireClinicSession();
    const item = await PatientsService.getById(clinicId, params.id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo cargar el paciente." }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const body = await req.json();
    const parsed = patientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const data = {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      secondLastName: parsed.data.secondLastName,
      run: parsed.data.run,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthDate:
        parsed.data.birthDate === undefined
          ? undefined
          : parsed.data.birthDate === null
            ? null
            : new Date(parsed.data.birthDate),
      gender: parsed.data.gender,
      address: parsed.data.address,
      city: parsed.data.city,
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
    };

    const item = await PatientsService.update(params.id, session.clinicId, data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el paciente.";
    const status = message.includes("registrado") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY"]);

    const result = await PatientsService.remove(params.id, session.clinicId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el paciente.";
    const status = message.includes("hoy o futuras") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
