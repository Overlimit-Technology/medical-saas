import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession } from "@/server/auth/requireSession";
import { VacationsService } from "@/server/vacations/VacationsService";
import { differenceInBusinessDays } from "date-fns";

const createVacationSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  note: z.string().max(600).optional().default(""),
});

export async function GET() {
  try {
    const session = await requireClinicSession();
    const items = await VacationsService.listOwn(session.clinicId, session.userId);
    const summary = await VacationsService.getVacationSummary(session.clinicId, session.userId);
    return NextResponse.json({ ok: true, items, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar tus vacaciones.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    const parsed = createVacationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    if (parsed.data.endDate < parsed.data.startDate) {
      return NextResponse.json({ ok: false, error: "La fecha de termino debe ser mayor o igual a inicio." }, { status: 400 });
    }

    const summary = await VacationsService.getVacationSummary(session.clinicId, session.userId);
    const selectedBusinessDays =
      differenceInBusinessDays(new Date(parsed.data.endDate), new Date(parsed.data.startDate)) + 1;
    if (selectedBusinessDays > summary.maxConsecutiveDays) {
      return NextResponse.json(
        { ok: false, error: `No puedes solicitar mas de ${summary.maxConsecutiveDays} dias seguidos.` },
        { status: 400 }
      );
    }
    if (selectedBusinessDays > summary.availableDays) {
      return NextResponse.json(
        { ok: false, error: "No tienes saldo suficiente para este rango." },
        { status: 400 }
      );
    }

    const item = await VacationsService.create({
      clinicId: session.clinicId,
      userId: session.userId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      note: parsed.data.note,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la solicitud.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
