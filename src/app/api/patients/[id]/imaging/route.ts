import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  studyName: z.string().min(1),
  doctorName: z.string().min(1),
  status: z.enum(["pendiente", "completado"]).default("pendiente"),
  imageUrl: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
  studiedAt: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["PATIENTS", "CLINICAL_VISITS"]);

    const items = await prisma.patientImaging.findMany({
      where: { patientId: params.id, clinicId: session.clinicId },
      orderBy: { studiedAt: "desc" },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar imagenología";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["PATIENTS", "CLINICAL_VISITS"]);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, clinicId: session.clinicId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ ok: false, error: "Paciente no encontrado." }, { status: 404 });
    }

    const item = await prisma.patientImaging.create({
      data: {
        clinicId: session.clinicId,
        patientId: params.id,
        studyName: parsed.data.studyName,
        doctorName: parsed.data.doctorName,
        status: parsed.data.status,
        imageUrl: parsed.data.imageUrl ?? null,
        observation: parsed.data.observation ?? null,
        studiedAt: parsed.data.studiedAt ? new Date(parsed.data.studiedAt) : new Date(),
      },
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar imagenología";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
