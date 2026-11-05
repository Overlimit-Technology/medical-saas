import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { ConsultationsService } from "@/server/consultations/ConsultationsService";
import { consultationClosureSchema } from "@/server/consultations/consultationSchemas";
import type { ConsultationClosureInput } from "@/domain/consultations/entities/Consultation";
import { requireClinicalUnlock } from "@/server/clinical/clinicalPin";
import { ClinicalAccessService } from "@/server/clinical/ClinicalAccessService";
import { clinicalError } from "@/server/clinical/clinicalRoute";

// POST /api/consultations/:appointmentId/close -> cierra la consulta y ejecuta
// lo acordado: proximo control o plan de sesiones, y cobro de la atencion.
export async function POST(req: Request, { params }: { params: { appointmentId: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["DOCTOR"]);
    await requireClinicalUnlock(session);

    const parsed = consultationClosureSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Faltan datos para cerrar la consulta." }, { status: 400 });
    }

    const { draft, followUp, charge, outcome } = parsed.data;
    const input: ConsultationClosureInput = {
      draft,
      outcome,
      followUp: followUp ? { ...followUp, notes: followUp.notes ?? null } : null,
      charge: charge ? { ...charge, notes: charge.notes ?? null } : null,
    };

    const { patientId, ...item } = await ConsultationsService.close({
      clinicId: session.clinicId,
      appointmentId: params.appointmentId,
      doctorId: session.userId,
      authorId: session.userId,
      input,
    });

    if (patientId) {
      await ClinicalAccessService.log({
        clinicId: session.clinicId,
        patientId,
        userId: session.userId,
        action: "CLOSE",
        resource: "consultation",
        resourceId: params.appointmentId,
        req,
      });
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return clinicalError(error, "No se pudo cerrar la consulta.");
  }
}
