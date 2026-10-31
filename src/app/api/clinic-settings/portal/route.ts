import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicSession, requireRole } from "@/server/auth/requireSession";
import { isValidPortalSlug } from "@/server/portal/PortalAuthService";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  slug: z.string().trim().toLowerCase().max(40).optional(),
});

function suggestSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function readSettings(clinicId: string, origin: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, settings: { select: { portalEnabled: true, portalSlug: true } } },
  });
  const slug = clinic?.settings?.portalSlug ?? null;
  const [accounts, patients] = await Promise.all([
    prisma.patientAccount.count({ where: { clinicId } }),
    prisma.patient.count({ where: { clinicId, isActive: true } }),
  ]);
  return {
    enabled: clinic?.settings?.portalEnabled ?? false,
    slug,
    suggestedSlug: suggestSlug(clinic?.name ?? ""),
    url: slug ? `${origin}/portal/${slug}` : null,
    accounts,
    patients,
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN", "SECRETARY", "DOCTOR"]);
    return NextResponse.json({ ok: true, ...(await readSettings(session.clinicId, new URL(req.url).origin)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el portal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClinicSession();
    requireRole(session.role, ["ADMIN"]);

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos invalidos." }, { status: 400 });
    const { enabled, slug } = parsed.data;

    if (slug !== undefined) {
      if (!isValidPortalSlug(slug)) {
        return NextResponse.json(
          { ok: false, error: "Usa de 3 a 40 letras minusculas, numeros o guiones, sin empezar ni terminar con guion." },
          { status: 400 }
        );
      }
      const taken = await prisma.clinicSettings.findFirst({
        where: { portalSlug: slug, NOT: { clinicId: session.clinicId } },
        select: { id: true },
      });
      if (taken) return NextResponse.json({ ok: false, error: "Ese enlace ya lo usa otra clinica." }, { status: 400 });
    }

    const current = await prisma.clinicSettings.findUnique({ where: { clinicId: session.clinicId }, select: { portalSlug: true } });
    if (enabled === true && !current?.portalSlug && !slug) {
      return NextResponse.json({ ok: false, error: "Elige primero el enlace del portal." }, { status: 400 });
    }

    const data = {
      ...(enabled !== undefined ? { portalEnabled: enabled } : {}),
      ...(slug !== undefined ? { portalSlug: slug } : {}),
    };
    await prisma.clinicSettings.upsert({
      where: { clinicId: session.clinicId },
      create: { clinicId: session.clinicId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true, ...(await readSettings(session.clinicId, new URL(req.url).origin)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el portal.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
