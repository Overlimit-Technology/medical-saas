import ConsultationConsole from "@/presentation/consultation/ConsultationConsole";

export default function ConsultationPage({ params }: { params: { appointmentId: string } }) {
  return <ConsultationConsole appointmentId={params.appointmentId} />;
}
