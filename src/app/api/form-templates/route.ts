import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { FormTemplatesService } from "@/server/form-templates/FormTemplatesService";
import type { TemplateType } from "@prisma/client";

const fieldSchema = z.object({
  label: z.string().trim().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA", "BOOLEAN", "SIGNATURE", "VARIABLE"]),
  position: z.number().int().min(0),
  isRequired: z.boolean().default(false),
  options: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  templateType: z.enum(["REPORT", "CONSENT", "ATTENDANCE_CERTIFICATE"]).default("REPORT"),
  fields: z.array(fieldSchema).min(1),
});

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type") as TemplateType | null;

    const items = await FormTemplatesService.list(
      session.clinicId,
      { userId: session.userId, role: session.role },
      typeParam ?? undefined,
    );
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar plantillas.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "DOCTOR"]);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const item = await FormTemplatesService.create(
      session.clinicId,
      { userId: session.userId, role: session.role },
      parsed.data,
    );
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear plantilla.";
    const status = message.includes("existe") || message.includes("Unique") ? 409 : message.includes("Solo los") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
