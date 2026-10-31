import PortalShell from "@/presentation/portal/PortalShell";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalPanelLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const badges = await PortalService.badges(ctx);
  const { patient, clinic } = ctx;

  return (
    <PortalShell
      slug={clinic.slug}
      clinicName={clinic.name}
      clinicPhone={clinic.phone}
      patientName={`${patient.firstName} ${patient.lastName}`}
      initials={`${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase()}
      pendingAppointments={badges.pendingAppointments}
      pendingPayments={badges.pendingPayments}
    >
      {children}
    </PortalShell>
  );
}
