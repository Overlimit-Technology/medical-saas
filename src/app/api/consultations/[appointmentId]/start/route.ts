import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";
import { consultationStartSchema } from "@/server/consultations/consultationSchemas";
import { requireClinicalUnlock } from "@/server/clinical/clinicalPin";
import { ClinicalAccessService } from "@/server/clinical/ClinicalAccessService";
import { clinicalError } from "@/server/clinical/clinicalRoute";

// POST /api/consultations/:appointmentId/start -> abre el encuentro clinico con el tipo de atencion elegido.
// Es idempotente: volver a entrar a una consulta abierta devuelve la misma.
export async function POST(req: Request, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);
    await requireClinicalUnlock(session);

    const parsed = consultationStartSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Elige el tipo de atencion." }, { status: 400 });
    }

    const { patientId, ...item } = await ConsultationsService.start({
      clinicId: session.clinicId,
      appointmentId: params.appointmentId,
      doctorId: session.userId,
      authorId: session.userId,
      input: { attentionTypeKey: parsed.data.attentionTypeKey, consent: parsed.data.consent ?? null },
    });

    await ClinicalAccessService.log({
      clinicId: session.clinicId,
      patientId,
      userId: session.userId,
      action: "EDIT",
      resource: "consultation.start",
      resourceId: params.appointmentId,
      req,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return clinicalError(error, "No se pudo iniciar la consulta.");
  }
}
