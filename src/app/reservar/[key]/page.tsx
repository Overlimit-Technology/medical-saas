import type { Metadata } from "next";
import PublicBooking from "@/presentation/booking/PublicBooking";

export const metadata: Metadata = {
  title: "Reserva tu hora",
  // La pagina usa un enlace privado por sede: no debe aparecer en buscadores.
  robots: { index: false, follow: false },
};

export default function ReservarPage({ params }: { params: { key: string } }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicBooking bookingKey={params.key} />
    </div>
  );
}
