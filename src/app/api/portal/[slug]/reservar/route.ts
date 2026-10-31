import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BookingService, type PublicClinic } from "@/server/booking/BookingService";
import { notifyOnlineBooking } from "@/server/booking/notifyOnlineBooking";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";
import { requirePortalApi, type PortalContext } from "@/server/portal/PortalService";
import { invalid, portalErrorResponse, tooMany } from "@/server/portal/apiResponse";

export const dynamic = "force-dynamic";

async function bookingClinic(ctx: PortalContext): Promise<PublicClinic> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: ctx.clinic.clinicId },
    select: { openingTime: true, closingTime: true },
  });
  return {
    clinicId: ctx.clinic.clinicId,
    name: ctx.clinic.name,
    address: ctx.clinic.address,
    phone: ctx.clinic.phone,
    openingTime: clinic?.openingTime ?? "08:00",
    closingTime: clinic?.closingTime ?? "20:00",
    slotMinutes: [15, 20, 30, 45, 60].includes(ctx.clinic.slotMinutes) ? ctx.clinic.slotMinutes : 30,
  };
}

/** Horas libres de un profesional en los proximos 14 dias. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "read")) return tooMany();
    const ctx = await requirePortalApi(params.slug);
    const url = new URL(req.url);
    const slots = await BookingService.getSlots(await bookingClinic(ctx), {
      doctorId: url.searchParams.get("doctorId"),
      days: 14,
    });
    return NextResponse.json({ ok: true, slots });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos cargar las horas.");
  }
}

const bodySchema = z.object({ doctorId: z.string().min(1).max(60), startAt: z.string().min(10).max(40) });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (isPublicRateLimited(req, "book")) return tooMany();
    const ctx = await requirePortalApi(params.slug);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid();

    const clinic = await bookingClinic(ctx);
    const { patient } = ctx;
    const booking = await BookingService.book({
      clinic,
      doctorId: parsed.data.doctorId,
      startAt: parsed.data.startAt,
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        run: patient.run,
        phone: patient.phone ?? "",
        email: patient.email,
      },
    });

    // Aviso a recepcion y correo al paciente: no bloquean la respuesta.
    void notifyOnlineBooking({
      clinicId: clinic.clinicId,
      clinicName: clinic.name,
      appointmentId: booking.appointmentId,
      doctorId: parsed.data.doctorId,
      doctorName: booking.doctorName,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientEmail: patient.email,
      when: booking.when,
      origin: new URL(req.url).origin,
    });

    return NextResponse.json({ ok: true, booking: { when: booking.when, doctorName: booking.doctorName } });
  } catch (error) {
    return portalErrorResponse(error, "No pudimos reservar tu hora.");
  }
}
