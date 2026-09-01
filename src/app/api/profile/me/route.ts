import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicSession } from "@/server/auth/requireSession";
import { resolveSingleClinicLabel } from "@/server/clinics/clinicDisplay";

export const dynamic = "force-dynamic";

const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  image: z.string().trim().url().optional().nullable().or(z.literal("")),
  teamCategoryId: z.string().optional().nullable(),
});

function mapProfile(item: {
  id: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  image: string | null;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    signatureUrl: string | null;
    teamCategoryId: string | null;
    teamCategory: { id: string; name: string } | null;
  } | null;
}) {
  return {
    id: item.id,
    email: item.email,
    role: item.role,
    isSuperAdmin: item.isSuperAdmin,
    permissions: item.permissions,
    image: item.image,
    firstName: item.profile?.firstName ?? "",
    lastName: item.profile?.lastName ?? "",
    phone: item.profile?.phone ?? "",
    signatureUrl: item.profile?.signatureUrl ?? null,
    teamCategoryId: item.profile?.teamCategoryId ?? null,
    teamCategoryName: item.profile?.teamCategory?.name ?? null,
  };
}

export async function GET() {
  try {
    const session = await requireClinicSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        permissions: true,
        image: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            signatureUrl: true,
            teamCategoryId: true,
            teamCategory: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
    return NextResponse.json({
      ok: true,
      item: mapProfile(user),
      clinicLabel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el perfil.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClinicSession();
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    }

    const image = parsed.data.image ? parsed.data.image.trim() : null;
    const phone = parsed.data.phone ? parsed.data.phone.trim() : null;
    const teamCategoryId = parsed.data.teamCategoryId || null;

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        image,
        profile: {
          upsert: {
            create: {
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              phone,
              teamCategoryId,
            },
            update: {
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              phone,
              teamCategoryId,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        permissions: true,
        image: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            signatureUrl: true,
            teamCategoryId: true,
            teamCategory: { select: { id: true, name: true } },
          },
        },
      },
    });

    const clinicLabel = await resolveSingleClinicLabel(session.clinicId);
    return NextResponse.json({
      ok: true,
      item: mapProfile(user),
      clinicLabel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el perfil.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
