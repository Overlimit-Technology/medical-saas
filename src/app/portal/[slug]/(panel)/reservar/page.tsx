import PortalBooking from "@/presentation/portal/PortalBooking";
import { BookingService } from "@/server/booking/BookingService";
import { requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalReservar({ params }: { params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const doctors = await BookingService.listDoctors(ctx.clinic.clinicId);

  return (
    <section className="view" aria-label="Reservar hora">
      <div className="page-head">
        <div>
          <span className="tag">Reservar hora</span>
          <h1>
            ¿Con quién quieres <span className="accent">atenderte?</span>
          </h1>
          <p className="lead">Elige al profesional y el horario que te acomode. La clínica confirma tu hora y te avisa por correo.</p>
        </div>
      </div>
      <PortalBooking slug={params.slug} doctors={doctors} clinicAddress={ctx.clinic.address} />
    </section>
  );
}
