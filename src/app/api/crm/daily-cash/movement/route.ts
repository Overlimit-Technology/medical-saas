import { NextResponse } from "next/server";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { CrmService } from "@/server/crm/CrmService";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["SECRETARY", "ADMIN"]);

    const body = await req.json();
    const { type, description, amount } = body as {
      type?: string;
      description?: string;
      amount?: number;
    };

    if (!type || !["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de movimiento invalido." },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { ok: false, error: "La descripcion es obligatoria." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "El monto debe ser mayor a 0." },
        { status: 400 }
      );
    }

    const result = await CrmService.createCashMovement({
      clinicId: session.clinicId,
      createdById: session.userId,
      type: type as "INCOME" | "EXPENSE",
      description: description.trim(),
      amount,
    });

    return NextResponse.json({ ok: true, movement: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
