import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError, BookingService } from "@/server/booking/BookingService";
import { isPublicRateLimited } from "@/server/booking/publicRateLimit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  doctorId: z.string().min(1).max(60).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(1).max(14).optional(),
});

/** Horas disponibles. Se calculan en el servidor con la agenda real. */
export async function GET(req: Request, { params }: { params: { key: string } }) {
  try {
    if (isPublicRateLimited(req, "read")) {
      return NextResponse.json({ ok: false, error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      doctorId: url.searchParams.get("doctorId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      days: url.searchParams.get("days") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Parametros invalidos." }, { status: 400 });
    }

    const clinic = await BookingService.resolveClinic(params.key);
    const slots = await BookingService.getSlots(clinic, {
      doctorId: parsed.data.doctorId,
      fromDate: parsed.data.from,
      days: parsed.data.days,
    });

    return NextResponse.json({ ok: true, slots });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las horas." }, { status: 500 });
  }
}
