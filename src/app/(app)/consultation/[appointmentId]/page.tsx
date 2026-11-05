import ClinicalLock from "@/presentation/clinical/ClinicalLock";
import ConsultationConsole from "@/presentation/consultation/ConsultationConsole";

export default function ConsultationPage({ params }: { params: { appointmentId: string } }) {
  return (
    <ClinicalLock>
      <ConsultationConsole appointmentId={params.appointmentId} />
    </ClinicalLock>
  );
}
