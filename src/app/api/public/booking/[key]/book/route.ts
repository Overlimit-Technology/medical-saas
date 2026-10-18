import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError, BookingService } from "@/server/booking/BookingService";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { notifyOnlineBooking } from "@/server/booking/notifyOnlineBooking";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  doctorId: z.string().min(1).max(60),
  startAt: z.string().min(10).max(40),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  run: z.string().trim().min(7).max(14),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,15}$/, "Ingresa un telefono valido."),
  email: z.string().trim().email("Ingresa un correo valido.").max(120).optional().or(z.literal("")),
  consent: z.boolean().refine((value) => value === true, {
    message: "Debes aceptar el uso de tus datos para reservar.",
  }),
  // Campo trampa para bots: las personas no lo ven ni lo llenan.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request, { params }: { params: { key: string } }) {
  try {
    if (isPublicRateLimited(req, "book")) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Espera unos minutos o llama a la clinica." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    // Un bot que llena el campo trampa recibe un error generico, sin pistas.
    if (body && typeof body === "object" && "website" in body && body.website) {
      return NextResponse.json({ ok: false, error: "No se pudo completar la reserva." }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    const clinic = await BookingService.resolveClinic(params.key);
    const booking = await BookingService.book({
      clinic,
      doctorId: parsed.data.doctorId,
      startAt: parsed.data.startAt,
      patient: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        run: parsed.data.run,
        phone: parsed.data.phone,
        email: parsed.data.email || undefined,
      },
    });

    // Aviso a recepcion y correo al paciente: nunca bloquean la respuesta.
    void notifyOnlineBooking({
      clinicId: clinic.clinicId,
      clinicName: clinic.name,
      appointmentId: booking.appointmentId,
      doctorId: parsed.data.doctorId,
      doctorName: booking.doctorName,
      patientName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      patientEmail: parsed.data.email || null,
      when: booking.when,
      origin: new URL(req.url).origin,
    });

    return NextResponse.json({
      ok: true,
      booking: {
        when: booking.when,
        time: booking.time,
        doctorName: booking.doctorName,
        clinicName: booking.clinicName,
      },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    console.error("[booking] error inesperado al reservar:", error);
    return NextResponse.json({ ok: false, error: "No se pudo completar la reserva." }, { status: 500 });
  }
}
