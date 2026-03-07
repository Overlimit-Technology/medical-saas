import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { DoctorsService } from "@/server/doctors/DoctorsService";
import { prisma } from "@/lib/prisma";

const doctorUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  rut: z.string().min(1).optional(),
  specialty: z.string().optional().nullable(),
  clinicIds: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    if (session.role === "DOCTOR" && session.userId !== params.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const item = await prisma.user.findFirst({
      where: {
        id: params.id,
        role: "DOCTOR",
        clinicMemberships: {
          some: { clinicId: session.clinicId, status: "ACTIVE" },
        },
      },
      include: { profile: true, doctorProfile: true },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load doctor" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = doctorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const item = await DoctorsService.update(params.id, session.clinicId, parsed.data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update doctor";
    const status = message.includes("exists") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const result = await DoctorsService.remove(params.id, session.clinicId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete doctor";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
