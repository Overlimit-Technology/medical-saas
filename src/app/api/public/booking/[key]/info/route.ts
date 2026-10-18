import { NextResponse } from "next/server";
import { BookingError, BookingService } from "@/server/booking/BookingService";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";

export const dynamic = "force-dynamic";

/** Datos publicos de la sede para la pagina de reservas. Nunca incluye datos de pacientes ni correos. */
export async function GET(req: Request, { params }: { params: { key: string } }) {
  try {
    if (isPublicRateLimited(req, "read")) {
      return NextResponse.json({ ok: false, error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const clinic = await BookingService.resolveClinic(params.key);
    const doctors = await BookingService.listDoctors(clinic.clinicId);

    return NextResponse.json({
      ok: true,
      clinic: {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        openingTime: clinic.openingTime,
        closingTime: clinic.closingTime,
        slotMinutes: clinic.slotMinutes,
      },
      doctors,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "No se pudo cargar la reserva." }, { status: 500 });
  }
}
