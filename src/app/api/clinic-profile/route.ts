import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoUrl: z
    .string()
    .refine((v) => v === "" || /^https?:\/\//.test(v), {
      message: "El logo debe ser una URL valida.",
    })
    .nullable()
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
        logo: true,
        settings: { select: { logoBase64: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      name: clinic?.name ?? "",
      city: clinic?.city ?? "",
      address: clinic?.address ?? "",
      phone: clinic?.phone ?? "",
      // `logo` es la URL de Cloudinary; `logoBase64` es el formato antiguo (fallback).
      logoUrl: clinic?.logo ?? clinic?.settings?.logoBase64 ?? null,
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

    const { name, city, address, phone, logoUrl } = parsed.data;

    const clinicUpdate: Record<string, unknown> = {};
    if (name !== undefined) clinicUpdate.name = name;
    if (city !== undefined) clinicUpdate.city = city;
    if (address !== undefined) clinicUpdate.address = address;
    if (phone !== undefined) clinicUpdate.phone = phone;
    if (logoUrl !== undefined) clinicUpdate.logo = logoUrl || null;

    if (Object.keys(clinicUpdate).length > 0) {
      await prisma.clinic.update({
        where: { id: session.clinicId },
        data: clinicUpdate,
      });
    }

    // Al fijar una URL nueva se descarta el base64 heredado para no dejar dos fuentes.
    if (logoUrl !== undefined) {
      await prisma.clinicSettings.updateMany({
        where: { clinicId: session.clinicId },
        data: { logoBase64: null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar perfil.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
