import { NextResponse } from "next/server";
import { requireClinicSession } from "@/server/auth/requireSession";
import { LeadsCrmService } from "@/server/leads/LeadsCrmService";

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
    }
    const col = await LeadsCrmService.createColumn(session.clinicId, {
      name: body.name.trim(),
      color: body.color || "#818cf8",
    });
    return NextResponse.json({ ok: true, item: { id: col.id, name: col.name, color: col.color, position: col.position } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear columna.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    if (!body.id || !body.name?.trim()) {
      return NextResponse.json({ ok: false, error: "ID y nombre son obligatorios." }, { status: 400 });
    }
    await LeadsCrmService.updateColumn(session.clinicId, body.id, {
      name: body.name.trim(),
      color: body.color || "#818cf8",
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar columna.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireClinicSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID es obligatorio." }, { status: 400 });
    }
    await LeadsCrmService.deleteColumn(session.clinicId, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al eliminar columna.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
