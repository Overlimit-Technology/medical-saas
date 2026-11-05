import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";
import { patientBackgroundSchema } from "@/server/consultations/consultationSchemas";
import { requireClinicalUnlock } from "@/server/clinical/clinicalPin";
import { clinicalError, logEditThrottled } from "@/server/clinical/clinicalRoute";

// PUT /api/consultations/:appointmentId/background -> antecedentes generales del paciente de esa cita.
export async function PUT(req: Request, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);
    await requireClinicalUnlock(session);

    const parsed = patientBackgroundSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Antecedentes invalidos." }, { status: 400 });

    const { patientId, updatedAt } = await ConsultationsService.saveBackground({
      clinicId: session.clinicId,
      doctorId: session.userId,
      appointmentId: params.appointmentId,
      authorId: session.userId,
      data: parsed.data,
    });

    await logEditThrottled({
      clinicId: session.clinicId,
      patientId,
      userId: session.userId,
      resource: "patient.background",
      resourceId: patientId,
      req,
    });

    return NextResponse.json({ ok: true, item: { updatedAt } });
  } catch (error) {
    return clinicalError(error, "No se pudieron guardar los antecedentes.");
  }
}
