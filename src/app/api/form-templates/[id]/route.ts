import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { FormTemplatesService } from "@/server/form-templates/FormTemplatesService";

const fieldSchema = z.object({
  label: z.string().trim().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA", "BOOLEAN"]),
  position: z.number().int().min(0),
  isRequired: z.boolean().default(false),
  options: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  fields: z.array(fieldSchema).min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const item = await FormTemplatesService.getById(params.id, session.clinicId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar plantilla.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const item = await FormTemplatesService.update(params.id, session.clinicId, parsed.data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar plantilla.";
    const status = message.includes("no encontrada") ? 404 : message.includes("existe") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    await FormTemplatesService.remove(params.id, session.clinicId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar plantilla.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
