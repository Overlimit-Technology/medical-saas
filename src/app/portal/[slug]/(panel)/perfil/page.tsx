import PortalProfile from "@/presentation/portal/PortalProfile";
import { shortDate } from "@/presentation/portal/format";
import { requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalPerfil({ params }: { params: { slug: string } }) {
  const { patient } = await requirePortalPage(params.slug);

  return (
    <section className="view" aria-label="Mi perfil">
      <div className="page-head">
        <div>
          <span className="tag">Mi perfil</span>
          <h1>Tus datos</h1>
          <p className="lead">Mantén al día tu contacto para que te lleguen los avisos de tus citas.</p>
        </div>
      </div>
      <PortalProfile
        slug={params.slug}
        patient={{
          fullName: [patient.firstName, patient.lastName, patient.secondLastName].filter(Boolean).join(" "),
          initials: `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase(),
          run: patient.run,
          email: patient.email,
          birthDate: patient.birthDate ? shortDate(patient.birthDate) : null,
          since: shortDate(patient.createdAt),
          phone: patient.phone ?? "",
          address: patient.address ?? "",
          city: patient.city ?? "",
          emergencyContactName: patient.emergencyContactName ?? "",
          emergencyContactPhone: patient.emergencyContactPhone ?? "",
        }}
      />
    </section>
  );
}
