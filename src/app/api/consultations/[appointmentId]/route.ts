import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";
import { consultationDraftSchema } from "@/server/consultations/consultationSchemas";
import { requireClinicalUnlock } from "@/server/clinical/clinicalPin";
import { ClinicalAccessService } from "@/server/clinical/ClinicalAccessService";
import { clinicalError, logEditThrottled } from "@/server/clinical/clinicalRoute";

/** Un doctor solo entra a sus propias citas; admin y secretaria ven las de la sede. */
function scopeFor(session: { role: string; userId: string; clinicId: string }) {
  return {
    clinicId: session.clinicId,
    doctorId: session.role === "DOCTOR" ? session.userId : null,
  };
}

export async function GET(req: Request, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session, ["ADMIN"], ["AGENDA", "CLINICAL_VISITS"]);
    await requireClinicalUnlock(session);

    const item = await ConsultationsService.bootstrap({
      ...scopeFor(session),
      appointmentId: params.appointmentId,
    });

    await ClinicalAccessService.log({
      clinicId: session.clinicId,
      patientId: item.patient.id,
      userId: session.userId,
      action: "OPEN",
      resource: "consultation",
      resourceId: params.appointmentId,
      req,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return clinicalError(error, "No se pudo cargar la consulta.");
  }
}

export async function PATCH(req: Request, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);
    await requireClinicalUnlock(session);

    const parsed = consultationDraftSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Borrador invalido." }, { status: 400 });
    }

    const { patientId, savedAt } = await ConsultationsService.saveDraft({
      ...scopeFor(session),
      appointmentId: params.appointmentId,
      doctorId: session.userId,
      draft: parsed.data,
    });

    await logEditThrottled({
      clinicId: session.clinicId,
      patientId,
      userId: session.userId,
      resource: "consultation",
      resourceId: params.appointmentId,
      req,
    });

    return NextResponse.json({ ok: true, item: { savedAt } });
  } catch (error) {
    return clinicalError(error, "No se pudo guardar el avance.");
  }
}
