import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoBase64: z
    .string()
    .refine((v) => v === "" || v.startsWith("data:image/"), {
      message: "El logo debe ser una imagen en formato base64.",
    })
    .optional(),
});

export async function GET() {
  try {
    const session = await requireClinicSession();

    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        name: true,
        city: true,
        address: true,
        phone: true,
        settings: { select: { logoBase64: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      name: clinic?.name ?? "",
      city: clinic?.city ?? "",
      address: clinic?.address ?? "",
      phone: clinic?.phone ?? "",
      logoBase64: clinic?.settings?.logoBase64 ?? null,
      isAdmin: session.role === "ADMIN",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar perfil.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 }
      );
    }

    const { name, city, address, phone, logoBase64 } = parsed.data;

    const clinicUpdate: Record<string, unknown> = {};
    if (name !== undefined) clinicUpdate.name = name;
    if (city !== undefined) clinicUpdate.city = city;
    if (address !== undefined) clinicUpdate.address = address;
    if (phone !== undefined) clinicUpdate.phone = phone;

    if (Object.keys(clinicUpdate).length > 0) {
      await prisma.clinic.update({
        where: { id: session.clinicId },
        data: clinicUpdate,
      });
    }

    if (logoBase64 !== undefined) {
      await prisma.clinicSettings.upsert({
        where: { clinicId: session.clinicId },
        create: { clinicId: session.clinicId, logoBase64: logoBase64 || null },
        update: { logoBase64: logoBase64 || null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar perfil.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
