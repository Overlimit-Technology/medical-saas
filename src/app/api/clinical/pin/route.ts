import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession } from "@/server/auth/requireSession";
import { ClinicalLockedError, lockClinical, pinStatus, setPin, unlockWithPin } from "@/server/clinical/clinicalPin";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unlock"), pin: z.string().max(12) }),
  z.object({ action: z.literal("set"), pin: z.string().max(12), password: z.string().min(1).max(200) }),
]);

function fail(error: unknown, fallback: string) {
  if (error instanceof ClinicalLockedError) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 423 });
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ ok: false, error: message }, { status: message === "No autorizado." ? 401 : 400 });
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    return NextResponse.json({ ok: true, item: await pinStatus(session) });
  } catch (error) {
    return fail(error, "No se pudo leer el estado del PIN.");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    if (parsed.data.action === "set") await setPin(session, parsed.data.password, parsed.data.pin, req);
    else await unlockWithPin(session, parsed.data.pin, req);
    return NextResponse.json({ ok: true, item: await pinStatus(session) });
  } catch (error) {
    return fail(error, "No se pudo validar el PIN.");
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireClinicSession();
    await lockClinical(session, req);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "No se pudo bloquear la ficha.");
  }
}
